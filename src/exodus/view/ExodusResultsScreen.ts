// ---------------------------------------------------------------------------
// Exodus mode — enhanced results screen with score breakdown & epitaphs
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusState } from "../state/ExodusState";
import { ExodusConfig } from "../config/ExodusConfig";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const FONT = "Georgia, serif";
const STYLE_TITLE = new TextStyle({ fontFamily: FONT, fontSize: 28, fill: 0xffd700, fontWeight: "bold", align: "center", letterSpacing: 3 });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xcccccc, fontStyle: "italic", align: "center", wordWrap: true, wordWrapWidth: 480, lineHeight: 20 });
const STYLE_STAT_LABEL = new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xaaaaaa });
const STYLE_STAT_VALUE = new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xffffff, fontWeight: "bold" });
const STYLE_SCORE = new TextStyle({ fontFamily: FONT, fontSize: 26, fill: 0xffd700, fontWeight: "bold" });
const STYLE_SCORE_PART = new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888888 });
const STYLE_EPITAPH = new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x888888, fontStyle: "italic", wordWrap: true, wordWrapWidth: 420, lineHeight: 14 });
const STYLE_BTN = new TextStyle({ fontFamily: FONT, fontSize: 14, fill: 0xffd700, fontWeight: "bold" });

// ---------------------------------------------------------------------------
// ExodusResultsScreen
// ---------------------------------------------------------------------------

export class ExodusResultsScreen {
  readonly container = new Container();

  private _retryCallback: (() => void) | null = null;
  private _menuCallback: (() => void) | null = null;

  setRetryCallback(cb: () => void): void { this._retryCallback = cb; }
  setMenuCallback(cb: () => void): void { this._menuCallback = cb; }

  show(state: ExodusState, sw: number, sh: number): void {
    this.container.removeChildren();

    const isVictory = state.victory;

    // Full overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.9 });
    overlay.eventMode = "static";
    this.container.addChild(overlay);

    // Panel
    const panelW = 520;
    const panelH = Math.min(sh * 0.88, 580);
    const panelX = (sw - panelW) / 2;
    const panelY = (sh - panelH) / 2;

    const borderColor = isVictory ? 0x44ff88 : 0xff6666;
    const panel = new Graphics();
    panel.roundRect(panelX, panelY, panelW, panelH, 10).fill({ color: isVictory ? 0x08120a : 0x120808, alpha: 0.97 });
    // Triple border for prestige
    panel.roundRect(panelX, panelY, panelW, panelH, 10).stroke({ color: borderColor, width: 3, alpha: 0.7 });
    panel.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, 9).stroke({ color: borderColor, width: 1, alpha: 0.2 });
    panel.roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 8).stroke({ color: borderColor, width: 0.5, alpha: 0.1 });
    // Corner ornaments
    const co = 10;
    for (const [cx, cy] of [[panelX + co, panelY + co], [panelX + panelW - co, panelY + co], [panelX + co, panelY + panelH - co], [panelX + panelW - co, panelY + panelH - co]]) {
      panel.circle(cx, cy, 4).fill({ color: borderColor, alpha: 0.5 });
      panel.circle(cx, cy, 2).fill({ color: borderColor, alpha: 0.8 });
    }
    this.container.addChild(panel);

    let y = panelY + 20;

    // Title
    const titleText = isVictory ? "AVALON" : "THE EXODUS HAS ENDED";
    const title = new Text({ text: titleText, style: { ...STYLE_TITLE, fill: borderColor } });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, y);
    this.container.addChild(title);
    y += 38;

    // Subtitle
    const subtitleText = this._getEndingText(state);
    const subtitle = new Text({ text: subtitleText, style: STYLE_SUBTITLE });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(sw / 2, y);
    this.container.addChild(subtitle);
    y += subtitle.height + 18;

    // Decorative line
    const line = new Graphics();
    line.moveTo(panelX + 40, y).lineTo(panelX + panelW - 40, y).stroke({ color: 0xdaa520, width: 1, alpha: 0.4 });
    this.container.addChild(line);
    y += 12;

    // Stats
    const survivors = state.members.length;
    const refugees = state.members.filter((m) => m.role === "refugee").length;
    const knights = state.members.filter((m) => m.role === "knight").length;

    const stats: [string, string, number?][] = [
      ["Days Survived", `${state.day}`, 0xffffff],
      ["Souls Delivered", `${survivors}`, survivors > 0 ? 0x44ff44 : 0xff4444],
      ["  Knights", `${knights}`, 0xddaa44],
      ["  Refugees Saved", `${refugees}`, refugees > 0 ? 0x44ffaa : 0xaaaaaa],
      ["Battles Won", `${state.battlesWon}`, 0xffffff],
      ["Battles Lost / Retreated", `${state.battlesLost} / ${state.battlesRetreated}`, 0xffffff],
      ["Total Fallen", `${state.totalDeaths}`, 0xff8888],
      ["Hexes Traveled", `${state.totalHexesTraveled}`, 0xffffff],
      ["Relics Found", `${state.relics.length}`, state.relics.length > 0 ? 0xffd700 : 0xaaaaaa],
      ["Days Rested", `${state.daysRested}`, 0xffffff],
    ];

    for (const [label, value, color] of stats) {
      const lbl = new Text({ text: label, style: STYLE_STAT_LABEL });
      lbl.position.set(panelX + 50, y);
      this.container.addChild(lbl);

      const val = new Text({ text: value, style: { ...STYLE_STAT_VALUE, fill: color ?? 0xffffff } });
      val.anchor.set(1, 0);
      val.position.set(panelX + panelW - 50, y);
      this.container.addChild(val);

      y += 18;
    }

    y += 8;

    // Score breakdown
    const scoreLine = new Graphics();
    scoreLine.moveTo(panelX + 40, y).lineTo(panelX + panelW - 40, y).stroke({ color: 0xdaa520, width: 1, alpha: 0.4 });
    this.container.addChild(scoreLine);
    y += 10;

    const scoreBreakdown = this._calculateScoreBreakdown(state);

    const scoreLabel = new Text({ text: "SCORE", style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xaaaaaa, letterSpacing: 2 }) });
    scoreLabel.anchor.set(0.5, 0);
    scoreLabel.position.set(sw / 2, y);
    this.container.addChild(scoreLabel);
    y += 16;

    // Score parts
    for (const [label, value] of scoreBreakdown.parts) {
      if (value === 0) continue;
      const pt = new Text({ text: `${label}: +${value}`, style: STYLE_SCORE_PART });
      pt.anchor.set(0.5, 0);
      pt.position.set(sw / 2, y);
      this.container.addChild(pt);
      y += 13;
    }

    y += 5;

    // Total score
    const scoreVal = new Text({ text: `${scoreBreakdown.total}`, style: STYLE_SCORE });
    scoreVal.anchor.set(0.5, 0);
    scoreVal.position.set(sw / 2, y);
    this.container.addChild(scoreVal);
    y += 35;

    // Epitaph
    const epitaph = this._generateEpitaph(state);
    if (epitaph) {
      const epText = new Text({ text: epitaph, style: STYLE_EPITAPH });
      epText.anchor.set(0.5, 0);
      epText.position.set(sw / 2, y);
      this.container.addChild(epText);
      y += epText.height + 8;
    }

    // Fallen heroes (up to 3 most notable)
    if (state.fallenHeroes.length > 0) {
      const heroes = state.fallenHeroes.slice(-3);
      for (const hero of heroes) {
        const quote = hero.quote ? ` "${hero.quote}"` : "";
        const ht = new Text({
          text: `\u2020 ${hero.name} (${hero.role}, day ${hero.day})${quote}`,
          style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 9, fill: 0x886666, fontStyle: "italic" }),
        });
        ht.anchor.set(0.5, 0);
        ht.position.set(sw / 2, y);
        this.container.addChild(ht);
        y += 13;
      }
      y += 5;
    }

    // Buttons
    const btnW = 140;
    const btnH = 34;
    const btnY = panelY + panelH - 50;

    const retryBtn = this._makeButton("Try Again", sw / 2 - btnW - 8, btnY, btnW, btnH, () => this._retryCallback?.());
    this.container.addChild(retryBtn);

    const menuBtn = this._makeButton("Main Menu", sw / 2 + 8, btnY, btnW, btnH, () => this._menuCallback?.());
    this.container.addChild(menuBtn);
  }

  // -------------------------------------------------------------------------
  // Ending text variations
  // -------------------------------------------------------------------------

  private _getEndingText(state: ExodusState): string {
    if (state.victory) {
      const refugees = state.members.filter((m) => m.role === "refugee").length;
      const total = state.members.length;
      const mercyNote = state.mercy > 15
        ? " The bards will sing of your compassion — the leader who carried every soul."
        : state.mercy < -15
          ? " Some call you cold. The survivors call you alive."
          : "";
      if (total > 25 && refugees > 8) {
        return "Through fire, loss, and endless marching, you led your people to the shores of Avalon. The mist parted. The green land welcomed them. Camelot lives on — not as a kingdom, but as a people." + mercyNote;
      } else if (total > 15) {
        return "The journey was long and the cost was great. But you reached Avalon. Those who survived will build anew. Camelot's flame, though dimmed, burns still.";
      } else if (total > 5) {
        return "A handful of survivors step onto Avalon's shore. So few remain from so many. But each one carries the memory of Camelot. It is enough.";
      } else {
        return "You reach Avalon alone, or nearly so. The exodus cost everything. But you are here. The last light of Camelot flickers on a distant shore.";
      }
    }

    if (state.hope <= 0) {
      return "Hope has been extinguished. Without belief in the destination, your people scattered into the wilderness, each seeking their own salvation. Avalon remains a myth — a beautiful lie told to keep broken people walking.";
    }
    if (state.members.length === 0) {
      return "The last of the caravan has fallen. No voice remains to speak of Camelot. No foot will touch Avalon's shore. The darkness is complete.";
    }
    if (state.morale <= 10) {
      return "Mutiny. In the cold of night, the caravan turned on itself. Steel met steel as hope met despair. When dawn came, there was no caravan — only scattered survivors and the echo of what might have been.";
    }
    return "The exodus has failed. Mordred's shadow swallowed everything. But perhaps, somewhere, a child who heard your stories will remember. Perhaps they will try again.";
  }

  // -------------------------------------------------------------------------
  // Score breakdown
  // -------------------------------------------------------------------------

  private _calculateScoreBreakdown(state: ExodusState): { total: number; parts: [string, number][] } {
    const survivors = state.members.length;
    const refugees = state.members.filter((m) => m.role === "refugee").length;
    const knights = state.members.filter((m) => m.role === "knight").length;

    const parts: [string, number][] = [
      ["Survivors", survivors * ExodusConfig.SCORE_PER_SURVIVOR],
      ["Refugees", refugees * ExodusConfig.SCORE_PER_REFUGEE],
      ["Knights", knights * 15],
      ["Days Survived", state.day * ExodusConfig.SCORE_PER_DAY_SURVIVED],
      ["Battles Won", state.battlesWon * 20],
      ["Relics", state.relics.length * ExodusConfig.SCORE_PER_RELIC],
      ["Victory Bonus", state.victory ? ExodusConfig.SCORE_VICTORY_BONUS : 0],
    ];

    const total = parts.reduce((sum, [, v]) => sum + v, 0);
    return { total, parts };
  }

  // -------------------------------------------------------------------------
  // Epitaph generator
  // -------------------------------------------------------------------------

  private _generateEpitaph(state: ExodusState): string | null {
    if (state.totalDeaths === 0) return "\"Not a single soul was lost. This is a miracle.\"";
    if (state.totalDeaths >= 20) return `\"We remember the ${state.totalDeaths} who fell on the long road west. Their names are carved in Avalon's stone.\"`;
    if (state.victory && state.totalDeaths > 0) {
      return `\"${state.totalDeaths} gave their lives so that ${state.members.length} might live. We will not forget.\"`;
    }
    if (!state.victory && state.day > 20) {
      return `\"They marched ${state.day} days before the darkness caught them. They were so close.\"`;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Button helper
  // -------------------------------------------------------------------------

  private _makeButton(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 4);
    bg.fill({ color: 0x2a2a3a, alpha: 0.9 });
    bg.stroke({ color: 0xdaa520, width: 2 });
    c.addChild(bg);

    const t = new Text({ text: label, style: STYLE_BTN });
    t.anchor.set(0.5);
    t.position.set(x + w / 2, y + h / 2);
    c.addChild(t);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear(); bg.roundRect(x, y, w, h, 4); bg.fill({ color: 0x3a3a5a, alpha: 0.9 }); bg.stroke({ color: 0xffd700, width: 2 });
    });
    bg.on("pointerout", () => {
      bg.clear(); bg.roundRect(x, y, w, h, 4); bg.fill({ color: 0x2a2a3a, alpha: 0.9 }); bg.stroke({ color: 0xdaa520, width: 2 });
    });
    bg.on("pointerdown", () => onClick());

    return c;
  }

  hide(): void { this.container.removeChildren(); }

  cleanup(): void {
    this._retryCallback = null;
    this._menuCallback = null;
    this.container.removeChildren();
  }
}
