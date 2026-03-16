// ---------------------------------------------------------------------------
// Tekken mode – Pixi.js HUD overlay
// Health bars, timer, round indicators, combo counter, announcements
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import { viewManager } from "../../view/ViewManager";
import type { TekkenState } from "../state/TekkenState";
import { TekkenPhase } from "../../types";
import { TB } from "../config/TekkenBalanceConfig";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";
import { getRankForRating } from "../config/TekkenRankedConfig";
import type { ComboChallengeState } from "../systems/TekkenComboChallengeSystem";

// ---- Battle Start Dialogue Data ------------------------------------------

interface DialoguePair {
  /** Character IDs (order doesn't matter; both permutations are checked) */
  ids: [string, string];
  /** Lines spoken: [id1 line, id2 line] */
  lines: [string, string];
}

/**
 * Relationship-based banter shown at the start of round 1.
 * Each pair references lore connections between the six fighters.
 */
const BATTLE_DIALOGUES: DialoguePair[] = [
  // Knight vs Berserker — rival warriors
  { ids: ["knight", "berserker"], lines: [
    "Your rage will be your undoing, Bjorn.",
    "And your caution will be yours, tin man!",
  ]},
  // Knight vs Paladin — fellow holy warriors, mutual respect
  { ids: ["knight", "paladin"], lines: [
    "Lady Isolde... I'd hoped we wouldn't meet like this.",
    "The light will decide who is worthy, Aldric.",
  ]},
  // Knight vs Monk — discipline vs duty
  { ids: ["knight", "monk"], lines: [
    "Your monastery teachings won't save you on the battlefield.",
    "A still mind cuts sharper than any sword, Sir Knight.",
  ]},
  // Knight vs Assassin — law vs shadow
  { ids: ["knight", "assassin"], lines: [
    "Step into the light, Shade. Face me with honor.",
    "Honor is a luxury the dead can't afford.",
  ]},
  // Knight vs Warlord — order vs chaos
  { ids: ["knight", "warlord"], lines: [
    "You've burned enough villages, Gorm. This ends now.",
    "You'll need more than a shiny sword to stop me!",
  ]},
  // Berserker vs Monk — brute force vs inner peace
  { ids: ["berserker", "monk"], lines: [
    "I'll break every bone in your praying hands!",
    "Anger clouds the mind. Let me clear it for you.",
  ]},
  // Berserker vs Paladin — chaos vs faith
  { ids: ["berserker", "paladin"], lines: [
    "Your god can't shield you from these fists!",
    "Even the wildest storm breaks against the mountain.",
  ]},
  // Berserker vs Assassin — loud vs silent
  { ids: ["berserker", "assassin"], lines: [
    "Stop skulking and fight me face to face!",
    "You won't see the blade that finishes you.",
  ]},
  // Berserker vs Warlord — kindred spirits, rival warlords
  { ids: ["berserker", "warlord"], lines: [
    "Only one of us walks away from this, Gorm!",
    "Ha! Finally, a worthy opponent! Come, Bjorn!",
  ]},
  // Monk vs Paladin — different faiths
  { ids: ["monk", "paladin"], lines: [
    "Your faith shines bright, but it blinds you.",
    "And your silence hides doubt, Brother Cedric.",
  ]},
  // Monk vs Assassin — awareness vs stealth
  { ids: ["monk", "assassin"], lines: [
    "I can hear your heartbeat, Shade. You cannot hide.",
    "Then you'll hear it quicken... right before I strike.",
  ]},
  // Monk vs Warlord — peace vs war
  { ids: ["monk", "warlord"], lines: [
    "Violence begets only suffering, Gorm.",
    "Suffering? I call it Tuesday! Hah!",
  ]},
  // Paladin vs Assassin — light vs darkness
  { ids: ["paladin", "assassin"], lines: [
    "The light reveals all shadows, creature of darkness.",
    "Even light casts shadows, holy woman.",
  ]},
  // Paladin vs Warlord — justice vs tyranny
  { ids: ["paladin", "warlord"], lines: [
    "By the light, your tyranny ends here!",
    "Tyranny? I prefer the term 'aggressive leadership'.",
  ]},
  // Assassin vs Warlord — blade vs axe
  { ids: ["assassin", "warlord"], lines: [
    "A big target is easy to hit.",
    "A small rat is easy to crush!",
  ]},
];

/** Mirror-match quips (fighter vs themselves) */
const MIRROR_DIALOGUES: Record<string, [string, string]> = {
  knight:   ["An impostor wearing my armor?!", "I was about to say the same, pretender."],
  berserker:["Another me?! TWICE THE CARNAGE!", "I'll smash your face in -- wait, MY face?!"],
  monk:     ["A mirror reveals one's true self.", "Then let us see which reflection is real."],
  paladin:  ["This is a test of faith... against myself.", "May the worthier vessel prevail."],
  assassin: ["A shadow of a shadow... interesting.", "There can only be one Shade."],
  warlord:  ["Hah! Finally someone as ugly as me!", "I'll enjoy caving in that familiar face!"],
};

function getBattleDialogue(id1: string, id2: string): { p1Line: string; p2Line: string } | null {
  // Mirror match
  if (id1 === id2) {
    const lines = MIRROR_DIALOGUES[id1];
    if (lines) return { p1Line: lines[0], p2Line: lines[1] };
    return null;
  }
  // Normal matchup
  for (const dp of BATTLE_DIALOGUES) {
    if (dp.ids[0] === id1 && dp.ids[1] === id2) {
      return { p1Line: dp.lines[0], p2Line: dp.lines[1] };
    }
    if (dp.ids[0] === id2 && dp.ids[1] === id1) {
      return { p1Line: dp.lines[1], p2Line: dp.lines[0] };
    }
  }
  return null;
}

// --------------------------------------------------------------------------

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
  private _trainingFrameBar: Graphics | null = null;
  private _trainingBestCombo: Text | null = null;
  private _trainingMoveHeight: Text | null = null;

  // Ranked mode overlay elements
  private _rankedContainer: Container | null = null;
  private _rankedRankText: Text | null = null;
  private _rankedRatingText: Text | null = null;
  private _rankedRecordText: Text | null = null;

  // Combo challenge overlay elements
  private _challengeContainer: Container | null = null;
  private _challengeTitle: Text | null = null;
  private _challengeSteps: Text | null = null;
  private _challengeStatus: Text | null = null;

  // Rage art meter elements
  private _rageMeterBgs: Graphics[] = [];
  private _rageMeterFills: Graphics[] = [];
  private _rageMeterLabels: Text[] = [];

  // Battle start dialogue state
  private _dialogueContainer: Container | null = null;
  private _dialogueP1Bubble: Container | null = null;
  private _dialogueP2Bubble: Container | null = null;
  private _dialogueTimer = 0;
  private _dialogueActive = false;
  private _dialogueShown = false; // only show once per match (round 1)

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

    // Rage Art meter (below health bars)
    const rageMeterW = barW * 0.35;
    const rageMeterH = 8;
    const rageMeterY = barY + barH + 28;
    for (let i = 0; i < 2; i++) {
      const rmX = i === 0
        ? centerX - barGap / 2 - rageMeterW
        : centerX + barGap / 2;

      // Rage meter background
      const rmBg = new Graphics();
      rmBg.roundRect(rmX - 1, rageMeterY - 1, rageMeterW + 2, rageMeterH + 2, 3).fill({ color: 0x222222, alpha: 0.8 });
      rmBg.roundRect(rmX, rageMeterY, rageMeterW, rageMeterH, 2).fill({ color: 0x1a0a0a });
      this._container.addChild(rmBg);
      this._rageMeterBgs.push(rmBg);

      // Rage meter fill
      const rmFill = new Graphics();
      this._container.addChild(rmFill);
      this._rageMeterFills.push(rmFill);

      // Rage meter label
      const rmLabel = new Text({
        text: "RAGE ART",
        style: { fontFamily: "Georgia, serif", fontSize: 9, fill: 0x666666, fontWeight: "bold", letterSpacing: 1 },
      });
      rmLabel.y = rageMeterY - 1;
      if (i === 0) {
        rmLabel.x = rmX + rageMeterW + 6;
        rmLabel.anchor.set(0, 0);
      } else {
        rmLabel.x = rmX - 6;
        rmLabel.anchor.set(1, 0);
      }
      this._container.addChild(rmLabel);
      this._rageMeterLabels.push(rmLabel);
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

    // Frame data bar (visual startup/active/recovery)
    this._trainingFrameBar = new Graphics();
    this._trainingFrameBar.x = 20;
    this._trainingFrameBar.y = viewManager.screenHeight - 70;
    this._trainingContainer.addChild(this._trainingFrameBar);

    // Move height display
    this._trainingMoveHeight = new Text({
      text: "",
      style: { ...trainingStyle, fill: 0xaaaaff },
    });
    this._trainingMoveHeight.x = 20;
    this._trainingMoveHeight.y = viewManager.screenHeight - 55;
    this._trainingContainer.addChild(this._trainingMoveHeight);

    // Best combo display
    this._trainingBestCombo = new Text({
      text: "",
      style: { fontFamily: "Courier New, monospace", fontSize: 14, fill: 0xffaa44 },
    });
    this._trainingBestCombo.anchor.set(1, 0);
    this._trainingBestCombo.x = sw - 20;
    this._trainingBestCombo.y = viewManager.screenHeight - 110;
    this._trainingContainer.addChild(this._trainingBestCombo);

    // Controls hint
    this._trainingControls = new Text({
      text: "F1: Toggle AI   F2: Reset Pos   F3: Hitboxes   F4: Frame Data",
      style: { fontFamily: "Courier New, monospace", fontSize: 13, fill: 0x666666 },
    });
    this._trainingControls.anchor.set(0.5, 1);
    this._trainingControls.x = centerX;
    this._trainingControls.y = viewManager.screenHeight - 10;
    this._trainingContainer.addChild(this._trainingControls);

    // Ranked mode overlay (hidden by default)
    this._rankedContainer = new Container();
    this._rankedContainer.visible = false;
    this._container.addChild(this._rankedContainer);

    this._rankedRankText = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 18, fill: 0xffcc00, fontWeight: "bold", letterSpacing: 2 },
    });
    this._rankedRankText.anchor.set(0.5, 0);
    this._rankedRankText.x = centerX;
    this._rankedRankText.y = 70;
    this._rankedContainer.addChild(this._rankedRankText);

    this._rankedRatingText = new Text({
      text: "",
      style: { fontFamily: "Courier New, monospace", fontSize: 14, fill: 0xaaaaaa },
    });
    this._rankedRatingText.anchor.set(0.5, 0);
    this._rankedRatingText.x = centerX;
    this._rankedRatingText.y = 92;
    this._rankedContainer.addChild(this._rankedRatingText);

    this._rankedRecordText = new Text({
      text: "",
      style: { fontFamily: "Courier New, monospace", fontSize: 12, fill: 0x888888 },
    });
    this._rankedRecordText.anchor.set(0.5, 0);
    this._rankedRecordText.x = centerX;
    this._rankedRecordText.y = 110;
    this._rankedContainer.addChild(this._rankedRecordText);

    // Combo challenge overlay (hidden by default)
    this._challengeContainer = new Container();
    this._challengeContainer.visible = false;
    this._container.addChild(this._challengeContainer);

    this._challengeTitle = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 18, fill: 0x44ddff, fontWeight: "bold" },
    });
    this._challengeTitle.anchor.set(1, 0);
    this._challengeTitle.x = sw - 20;
    this._challengeTitle.y = viewManager.screenHeight * 0.25;
    this._challengeContainer.addChild(this._challengeTitle);

    this._challengeSteps = new Text({
      text: "",
      style: { fontFamily: "Courier New, monospace", fontSize: 15, fill: 0xdddddd },
    });
    this._challengeSteps.anchor.set(1, 0);
    this._challengeSteps.x = sw - 20;
    this._challengeSteps.y = viewManager.screenHeight * 0.25 + 28;
    this._challengeContainer.addChild(this._challengeSteps);

    this._challengeStatus = new Text({
      text: "",
      style: { fontFamily: "Georgia, serif", fontSize: 22, fill: 0x44ff44, fontWeight: "bold" },
    });
    this._challengeStatus.anchor.set(1, 0);
    this._challengeStatus.x = sw - 20;
    this._challengeStatus.y = viewManager.screenHeight * 0.25 - 30;
    this._challengeContainer.addChild(this._challengeStatus);
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

      // Rage Art meter update
      if (this._rageMeterFills[i] && this._rageMeterLabels[i]) {
        const rageMeterW = barW * 0.35;
        const rageMeterH = 8;
        const rageMeterY = barY + barH + 28;
        const rmX = i === 0
          ? centerX - barGap / 2 - rageMeterW
          : centerX + barGap / 2;

        const rmFill = this._rageMeterFills[i];
        rmFill.clear();

        // Rage meter fills as health drops toward rage threshold
        // Full when hp <= threshold, empty when hp == maxHp
        const rageThreshold = TB.RAGE_THRESHOLD; // 0.25
        const hpRatio = fighter.hp / fighter.maxHp;
        // Map from [1.0 .. threshold] => [0 .. 1]
        const rageFill = Math.min(1, Math.max(0, (1 - hpRatio) / (1 - rageThreshold)));

        if (fighter.rageActive && !fighter.rageArtUsed) {
          // Rage art available: pulsing bright red/orange
          const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
          // Glow effect
          rmFill.roundRect(rmX - 2, rageMeterY - 2, rageMeterW + 4, rageMeterH + 4, 4)
            .fill({ color: 0xff2200, alpha: pulse * 0.4 });
          // Full meter in bright red/orange
          rmFill.roundRect(rmX, rageMeterY, rageMeterW, rageMeterH, 2)
            .fill({ color: 0xff4411 });
          // Highlight shimmer
          rmFill.roundRect(rmX + 1, rageMeterY + 1, rageMeterW - 2, rageMeterH * 0.4, 1)
            .fill({ color: 0xffaa44, alpha: 0.5 + pulse * 0.3 });

          this._rageMeterLabels[i].text = "RAGE ART READY!";
          this._rageMeterLabels[i].style.fill = 0xff4422;
        } else if (fighter.rageArtUsed) {
          // Already used rage art
          this._rageMeterLabels[i].text = "RAGE ART";
          this._rageMeterLabels[i].style.fill = 0x333333;
        } else {
          // Building up toward rage
          const fillW = rageMeterW * rageFill;
          if (fillW > 0) {
            const meterColor = rageFill > 0.8 ? 0xcc4400 : rageFill > 0.5 ? 0x995500 : 0x663300;
            if (i === 0) {
              rmFill.roundRect(rmX + rageMeterW - fillW, rageMeterY, fillW, rageMeterH, 2)
                .fill({ color: meterColor });
            } else {
              rmFill.roundRect(rmX, rageMeterY, fillW, rageMeterH, 2)
                .fill({ color: meterColor });
            }
          }
          this._rageMeterLabels[i].text = "RAGE ART";
          this._rageMeterLabels[i].style.fill = rageFill > 0.8 ? 0xcc6633 : 0x666666;
        }
      }

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

    // Battle start dialogue (during intro phase)
    if (state.phase === TekkenPhase.INTRO && !this._dialogueShown) {
      this.showBattleDialogue(state.fighters[0].characterId, state.fighters[1].characterId);
    }
    this._updateDialogue();

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

        // Frame data bar visualization
        if (this._trainingFrameBar && tm.showFrameDataOverlay) {
          this._trainingFrameBar.clear();
          const barTotalW = 200;
          const barH = 10;
          const totalFrames = tm.lastMoveStartup + tm.lastMoveActive + tm.lastMoveRecovery;
          if (totalFrames > 0) {
            const startupW = (tm.lastMoveStartup / totalFrames) * barTotalW;
            const activeW = (tm.lastMoveActive / totalFrames) * barTotalW;
            const recoveryW = (tm.lastMoveRecovery / totalFrames) * barTotalW;
            // Background
            this._trainingFrameBar.roundRect(0, 0, barTotalW, barH, 2).fill({ color: 0x222222 });
            // Startup (yellow)
            this._trainingFrameBar.rect(0, 0, startupW, barH).fill({ color: 0xdddd44 });
            // Active (green)
            this._trainingFrameBar.rect(startupW, 0, activeW, barH).fill({ color: 0x44dd44 });
            // Recovery (red)
            this._trainingFrameBar.rect(startupW + activeW, 0, recoveryW, barH).fill({ color: 0xdd4444 });

            // Current phase indicator
            if (tm.overlayMovePhase !== "none" && tm.overlayPhaseTotal > 0) {
              let indicatorX = 0;
              const phaseFrac = tm.overlayPhaseFrame / tm.overlayPhaseTotal;
              if (tm.overlayMovePhase === "startup") {
                indicatorX = phaseFrac * startupW;
              } else if (tm.overlayMovePhase === "active") {
                indicatorX = startupW + phaseFrac * activeW;
              } else if (tm.overlayMovePhase === "recovery") {
                indicatorX = startupW + activeW + phaseFrac * recoveryW;
              }
              this._trainingFrameBar.rect(indicatorX - 1, -2, 2, barH + 4).fill({ color: 0xffffff });
            }
          }
        }

        // Move height display
        if (this._trainingMoveHeight) {
          this._trainingMoveHeight.text = tm.lastMoveHeight
            ? `Height: ${tm.lastMoveHeight.toUpperCase()}  On Block: ${tm.lastOnBlock >= 0 ? "+" : ""}${tm.lastOnBlock}  On Hit: ${tm.lastOnHit >= 0 ? "+" : ""}${tm.lastOnHit}`
            : "";
        }

        // Best combo display
        if (this._trainingBestCombo) {
          if (tm.bestComboCount > 0) {
            this._trainingBestCombo.text = `Best: ${tm.bestComboCount} hits / ${tm.bestComboDamage} dmg`;
          } else {
            this._trainingBestCombo.text = "";
          }
        }

        // Hide round timer in training mode
        this._timerText!.text = "\u221E";
        this._timerText!.style.fill = 0x888888;
      }
    }

    // Ranked mode overlay
    if (this._rankedContainer) {
      const isRanked = state.gameMode === "ranked";
      this._rankedContainer.visible = isRanked;
      if (isRanked) {
        const profile = state.rankedProfile;
        const rank = getRankForRating(profile.rating);
        this._rankedRankText!.text = `${rank.icon} ${rank.name.toUpperCase()} RANK`;
        this._rankedRankText!.style.fill = rank.color;
        this._rankedRatingText!.text = `Rating: ${profile.rating}  |  Streak: ${profile.winStreak}`;
        this._rankedRecordText!.text = `W: ${profile.wins}  L: ${profile.losses}`;
      }
    }
  }

  // ---- Combo Challenge Overlay -----------------------------------------------

  /** Update the combo challenge display with current challenge state */
  updateComboChallengeOverlay(challengeState: ComboChallengeState): void {
    if (!this._challengeContainer) return;

    const challenge = challengeState.activeChallenge;
    if (!challenge) {
      this._challengeContainer.visible = false;
      return;
    }

    this._challengeContainer.visible = true;

    this._challengeTitle!.text = `${challenge.name} [${challenge.difficulty.toUpperCase()}]`;

    // Build step display
    const lines: string[] = [];
    for (let i = 0; i < challenge.steps.length; i++) {
      const step = challenge.steps[i];
      let prefix = "  ";
      if (i < challengeState.currentStepIndex) {
        prefix = "\u2713 "; // checkmark
      } else if (i === challengeState.currentStepIndex) {
        prefix = "> ";
      } else if (i === challengeState.lastFailedStep) {
        prefix = "X ";
      }
      lines.push(`${prefix}${step.display}`);
    }
    this._challengeSteps!.text = lines.join("\n");

    // Status
    if (challengeState.completed) {
      this._challengeStatus!.text = `COMPLETE! (${challengeState.completionCount}x)`;
      this._challengeStatus!.style.fill = 0x44ff44;
    } else if (challengeState.lastFailedStep >= 0) {
      this._challengeStatus!.text = "DROPPED - Resetting...";
      this._challengeStatus!.style.fill = 0xff4444;
    } else if (challengeState.currentStepIndex > 0) {
      this._challengeStatus!.text = `${challengeState.currentStepIndex}/${challenge.steps.length}`;
      this._challengeStatus!.style.fill = 0xffcc00;
    } else {
      this._challengeStatus!.text = "";
    }
  }

  // ---- Battle Start Dialogue ------------------------------------------------

  /**
   * Call once at the start of round 1 to show character banter.
   * Builds speech bubble containers for both fighters.
   */
  showBattleDialogue(p1Id: string, p2Id: string): void {
    if (this._dialogueShown || !this._container) return;
    this._dialogueShown = true;

    const dialogue = getBattleDialogue(p1Id, p2Id);
    if (!dialogue) return;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._dialogueContainer = new Container();
    this._container.addChild(this._dialogueContainer);

    // Build P1 bubble (bottom-left)
    const p1Char = TEKKEN_CHARACTERS.find(c => c.id === p1Id);
    this._dialogueP1Bubble = this._buildSpeechBubble(
      p1Char?.name ?? p1Id,
      dialogue.p1Line,
      sw * 0.05,
      sh * 0.68,
      sw * 0.38,
      0,   // left-aligned tail
    );
    this._dialogueP1Bubble.alpha = 0;
    this._dialogueContainer.addChild(this._dialogueP1Bubble);

    // Build P2 bubble (bottom-right)
    const p2Char = TEKKEN_CHARACTERS.find(c => c.id === p2Id);
    this._dialogueP2Bubble = this._buildSpeechBubble(
      p2Char?.name ?? p2Id,
      dialogue.p2Line,
      sw * 0.57,
      sh * 0.68,
      sw * 0.38,
      1,   // right-aligned tail
    );
    this._dialogueP2Bubble.alpha = 0;
    this._dialogueContainer.addChild(this._dialogueP2Bubble);

    this._dialogueActive = true;
    this._dialogueTimer = 0;
  }

  private _buildSpeechBubble(
    speakerName: string,
    line: string,
    x: number,
    y: number,
    maxW: number,
    side: number, // 0 = left tail, 1 = right tail
  ): Container {
    const c = new Container();
    c.x = x;
    c.y = y;

    const padX = 16;
    const padY = 12;

    // Name label
    const nameText = new Text({
      text: speakerName,
      style: {
        fontFamily: "Georgia, serif",
        fontSize: 16,
        fill: 0xffdd66,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    nameText.x = padX;
    nameText.y = 6;

    // Dialogue text
    const lineText = new Text({
      text: `"${line}"`,
      style: {
        fontFamily: "Georgia, serif",
        fontSize: 18,
        fill: 0xeeeeee,
        fontStyle: "italic",
        wordWrap: true,
        wordWrapWidth: maxW - padX * 2,
        lineHeight: 24,
      },
    });
    lineText.x = padX;
    lineText.y = 28;

    // Compute bubble size
    const bubbleW = maxW;
    const bubbleH = lineText.y + lineText.height + padY;

    // Draw background
    const bg = new Graphics();
    // Shadow
    bg.roundRect(3, 3, bubbleW, bubbleH, 10).fill({ color: 0x000000, alpha: 0.4 });
    // Main bubble
    bg.roundRect(0, 0, bubbleW, bubbleH, 10).fill({ color: 0x1a1a2e, alpha: 0.92 });
    // Border
    bg.roundRect(0, 0, bubbleW, bubbleH, 10).stroke({ color: 0x444466, width: 2, alpha: 0.8 });

    // Speech tail triangle
    const tailX = side === 0 ? 30 : bubbleW - 30;
    bg.moveTo(tailX - 8, bubbleH)
      .lineTo(tailX, bubbleH + 14)
      .lineTo(tailX + 8, bubbleH)
      .fill({ color: 0x1a1a2e, alpha: 0.92 });

    c.addChild(bg);
    c.addChild(nameText);
    c.addChild(lineText);

    return c;
  }

  /** Animate dialogue bubbles during intro. Call from update(). */
  private _updateDialogue(): void {
    if (!this._dialogueActive || !this._dialogueContainer) return;

    this._dialogueTimer++;

    const FADE_IN_FRAMES = 15;
    const P1_APPEAR = 10;   // P1 bubble appears at frame 10
    const P2_APPEAR = 35;   // P2 bubble appears at frame 35
    const FADE_OUT_START = 75; // start fading both out
    const DIALOGUE_END = 90;   // fully gone

    // P1 bubble fade in
    if (this._dialogueP1Bubble) {
      if (this._dialogueTimer >= P1_APPEAR && this._dialogueTimer < FADE_OUT_START) {
        const t = Math.min(1, (this._dialogueTimer - P1_APPEAR) / FADE_IN_FRAMES);
        this._dialogueP1Bubble.alpha = t;
        // Slide up slightly
        this._dialogueP1Bubble.y += (0 - 8 * (1 - t)) * 0.1;
      } else if (this._dialogueTimer >= FADE_OUT_START) {
        const t = Math.min(1, (this._dialogueTimer - FADE_OUT_START) / (DIALOGUE_END - FADE_OUT_START));
        this._dialogueP1Bubble.alpha = 1 - t;
      }
    }

    // P2 bubble fade in
    if (this._dialogueP2Bubble) {
      if (this._dialogueTimer >= P2_APPEAR && this._dialogueTimer < FADE_OUT_START) {
        const t = Math.min(1, (this._dialogueTimer - P2_APPEAR) / FADE_IN_FRAMES);
        this._dialogueP2Bubble.alpha = t;
        this._dialogueP2Bubble.y += (0 - 8 * (1 - t)) * 0.1;
      } else if (this._dialogueTimer >= FADE_OUT_START) {
        const t = Math.min(1, (this._dialogueTimer - FADE_OUT_START) / (DIALOGUE_END - FADE_OUT_START));
        this._dialogueP2Bubble.alpha = 1 - t;
      }
    }

    // Clean up when done
    if (this._dialogueTimer >= DIALOGUE_END) {
      this._dialogueActive = false;
      this._dialogueContainer.destroy({ children: true });
      this._dialogueContainer = null;
      this._dialogueP1Bubble = null;
      this._dialogueP2Bubble = null;
    }
  }

  /** Reset dialogue state so it can show again on a new match */
  resetDialogue(): void {
    this._dialogueShown = false;
    this._dialogueActive = false;
    this._dialogueTimer = 0;
    if (this._dialogueContainer) {
      this._dialogueContainer.destroy({ children: true });
      this._dialogueContainer = null;
      this._dialogueP1Bubble = null;
      this._dialogueP2Bubble = null;
    }
  }

  destroy(): void {
    if (this._dialogueContainer) {
      this._dialogueContainer.destroy({ children: true });
      this._dialogueContainer = null;
    }
    if (this._container) {
      viewManager.removeFromLayer("ui", this._container);
      this._container.destroy({ children: true });
      this._container = null;
    }
  }
}
