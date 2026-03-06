// Overlay shown during RESOLVE phase: winner announcement, stats, unit damage breakdown
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { GamePhase, GameMode } from "@/types";
import { battleStatsTracker } from "@sim/systems/BattleStatsTracker";
import type { UnitTypeDamageEntry } from "@sim/systems/BattleStatsTracker";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_WINNER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 48,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 4,
  dropShadow: {
    color: 0x000000,
    blur: 10,
    distance: 3,
    angle: Math.PI / 4,
    alpha: 0.9,
  },
});

const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fill: 0xaabbcc,
  letterSpacing: 2,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_SECTION_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_STAT_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_STAT_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_DMG_HEADER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899aa,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_DMG_UNIT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xccddee,
  letterSpacing: 0,
});

const STYLE_DMG_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xff8866,
  fontWeight: "bold",
  letterSpacing: 0,
});

const STYLE_DMG_KILLS = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0x88ff88,
  letterSpacing: 0,
});

// ---------------------------------------------------------------------------
// VictoryScreen
// ---------------------------------------------------------------------------

export class VictoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Container;
  private _cardBg!: Graphics;
  private _winnerText!: Text;
  private _subtitleText!: Text;
  private _nextWaveBtn!: Container;
  private _menuBtn!: Container;
  private _statsContainer!: Container;

  private readonly _CARD_W = 700;
  private _currentCardH = 260;

  /** If > 0, this is a wave mode battle. Set before init or before phase resolves. */
  waveNumber = 0;

  /** Corruption level for Grail Greed mode display. 0 = no corruption. */
  corruptionLevel = 0;

  /** Gold spent this round (set externally before battle). */
  lastRoundGoldSpent = 0;

  /** Total gold spent across all waves (set externally). */
  totalGoldSpent = 0;

  /** Called when the player clicks "NEXT WAVE" in wave mode. */
  onNextWave: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private _unsubscribers: Array<() => void> = [];
  private _onResize: (() => void) | null = null;

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    // Semi-transparent full-screen overlay
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    // Card
    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    // Winner text
    this._winnerText = new Text({ text: "", style: STYLE_WINNER });
    this._winnerText.anchor.set(0.5, 0);
    this._winnerText.position.set(this._CARD_W / 2, 24);
    this._card.addChild(this._winnerText);

    // Subtitle
    this._subtitleText = new Text({ text: "VICTORY", style: STYLE_SUBTITLE });
    this._subtitleText.anchor.set(0.5, 0);
    this._subtitleText.position.set(this._CARD_W / 2, 80);
    this._card.addChild(this._subtitleText);

    // Divider after header
    this._card.addChild(
      new Graphics()
        .rect(30, 112, this._CARD_W - 60, 1)
        .fill({ color: 0xffd700, alpha: 0.3 }),
    );

    // Stats + damage list container (populated dynamically)
    this._statsContainer = new Container();
    this._statsContainer.position.set(0, 120);
    this._card.addChild(this._statsContainer);

    // Return to Menu button
    const BW = 240;
    const BH = 46;

    this._menuBtn = new Container();
    this._menuBtn.eventMode = "static";
    this._menuBtn.cursor = "pointer";

    const btnBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    this._menuBtn.addChild(btnBg);

    const btnLabel = new Text({ text: "RETURN TO MENU", style: STYLE_BTN });
    btnLabel.style.fill = 0x88ccff;
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    this._menuBtn.addChild(btnLabel);

    this._menuBtn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    this._menuBtn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    this._menuBtn.on("pointerdown", () => { window.location.reload(); });

    this._card.addChild(this._menuBtn);

    // Next Wave button (wave mode only)
    const NW_BW = 240;
    this._nextWaveBtn = new Container();
    this._nextWaveBtn.eventMode = "static";
    this._nextWaveBtn.cursor = "pointer";
    this._nextWaveBtn.visible = false;

    const nwBg = new Graphics()
      .roundRect(0, 0, NW_BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, NW_BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    this._nextWaveBtn.addChild(nwBg);

    const nwLabel = new Text({ text: "NEXT WAVE  >", style: STYLE_BTN });
    nwLabel.style.fill = 0x88ffaa;
    nwLabel.anchor.set(0.5, 0.5);
    nwLabel.position.set(NW_BW / 2, BH / 2);
    this._nextWaveBtn.addChild(nwLabel);

    this._nextWaveBtn.on("pointerover", () => { nwBg.tint = 0xaaffcc; });
    this._nextWaveBtn.on("pointerout", () => { nwBg.tint = 0xffffff; });
    this._nextWaveBtn.on("pointerdown", () => {
      this.container.visible = false;
      this.onNextWave?.();
    });

    this._card.addChild(this._nextWaveBtn);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();

    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);

    // React to phase changes
    this._unsubscribers.push(
      EventBus.on("phaseChanged", ({ phase }) => {
        if (phase === GamePhase.RESOLVE) {
          // Campaign mode P1 victory is handled by CampaignVictoryScreen instead
          if (state.gameMode === GameMode.CAMPAIGN && state.winnerId === "p1") return;
          this._show(state);
        }
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _show(state: GameState): void {
    const isWave = this.waveNumber > 0;
    const p1Won = state.winnerId === "p1";

    const corruptionTag = this.corruptionLevel > 0
      ? ` — CORRUPTION ${this.corruptionLevel}`
      : "";

    if (state.winnerId === null) {
      this._winnerText.text = "DRAW";
      this._subtitleText.text = isWave
        ? `WAVE ${this.waveNumber}${corruptionTag} — MUTUAL DESTRUCTION`
        : "MUTUAL DESTRUCTION";
    } else {
      const playerLabels: Record<string, string> = {
        p1: "PLAYER 1",
        p2: "PLAYER 2",
        p3: "PLAYER 3",
        p4: "PLAYER 4",
      };
      const label = playerLabels[state.winnerId] ?? state.winnerId.toUpperCase();
      this._winnerText.text = label;
      this._subtitleText.text = isWave
        ? `WAVE ${this.waveNumber}${corruptionTag} ${p1Won ? "COMPLETE" : "— DEFEATED"}`
        : "WINS THE ROUND";
    }

    // Build stats + damage breakdown
    this._buildStats(state, isWave);

    // Position buttons below stats
    const statsH = this._statsContainer.getBounds().height;
    const btnY = 120 + statsH + 20;
    const BH = 46;

    if (isWave && p1Won) {
      this._nextWaveBtn.visible = true;
      // Side by side buttons
      this._nextWaveBtn.position.set(this._CARD_W / 2 - 250, btnY);
      this._menuBtn.position.set(this._CARD_W / 2 + 10, btnY);
      this._currentCardH = btnY + BH + 24;
    } else {
      this._nextWaveBtn.visible = false;
      this._menuBtn.position.set(this._CARD_W / 2 - 120, btnY);
      this._currentCardH = btnY + BH + 24;
    }

    this._drawCard(this._currentCardH);
    this.container.visible = true;
    this._layout();
  }

  private _buildStats(state: GameState, isWave: boolean): void {
    this._statsContainer.removeChildren();
    const stats = battleStatsTracker.getStats();
    const p1Stats = stats.perPlayer.get("p1");

    const PAD = 30;
    const COL_LEFT = PAD;
    const COL_RIGHT = this._CARD_W / 2 + 10;
    let ly = 0; // left column y
    let ry = 0; // right column y

    // --- LEFT COLUMN: Battle Stats ---
    const statsLabel = new Text({ text: "BATTLE STATS", style: STYLE_SECTION_LABEL });
    statsLabel.position.set(COL_LEFT, ly);
    this._statsContainer.addChild(statsLabel);
    ly += 24;

    const addStat = (label: string, value: string, y: number, col: number): number => {
      const lbl = new Text({ text: label, style: STYLE_STAT_LABEL });
      lbl.position.set(col, y);
      this._statsContainer.addChild(lbl);

      const val = new Text({ text: value, style: STYLE_STAT_VALUE });
      val.position.set(col + 200, y);
      this._statsContainer.addChild(val);
      return y + 22;
    };

    if (p1Stats) {
      ly = addStat("Damage Dealt", _fmtNum(p1Stats.damageDealt), ly, COL_LEFT);
      ly = addStat("Damage Received", _fmtNum(p1Stats.damageReceived), ly, COL_LEFT);
      ly = addStat("Kills", _fmtNum(p1Stats.kills), ly, COL_LEFT);
      ly = addStat("Units Lost", _fmtNum(p1Stats.unitsLost), ly, COL_LEFT);
      ly = addStat("Healing Done", _fmtNum(p1Stats.healingDone), ly, COL_LEFT);
    }

    if (isWave) {
      ly += 6;
      // Divider
      this._statsContainer.addChild(
        new Graphics()
          .rect(COL_LEFT, ly, 280, 1)
          .fill({ color: 0xffd700, alpha: 0.15 }),
      );
      ly += 10;

      ly = addStat("Gold (This Wave)", _fmtNum(this.lastRoundGoldSpent), ly, COL_LEFT);
      ly = addStat("Gold (All Waves)", _fmtNum(this.totalGoldSpent), ly, COL_LEFT);

      // Surviving units count
      let survivorCount = 0;
      for (const u of state.units.values()) {
        if (u.owner === "p1" && u.hp > 0) survivorCount++;
      }
      ly = addStat("Surviving Units", String(survivorCount), ly, COL_LEFT);
    }

    // --- RIGHT COLUMN: Unit Damage Breakdown ---
    const dmgLabel = new Text({ text: "UNIT DAMAGE BREAKDOWN", style: STYLE_SECTION_LABEL });
    dmgLabel.position.set(COL_RIGHT, ry);
    this._statsContainer.addChild(dmgLabel);
    ry += 24;

    // Header row
    const hdrUnit = new Text({ text: "UNIT", style: STYLE_DMG_HEADER });
    hdrUnit.position.set(COL_RIGHT, ry);
    this._statsContainer.addChild(hdrUnit);

    const hdrDmg = new Text({ text: "DAMAGE", style: STYLE_DMG_HEADER });
    hdrDmg.position.set(COL_RIGHT + 150, ry);
    this._statsContainer.addChild(hdrDmg);

    const hdrKills = new Text({ text: "KILLS", style: STYLE_DMG_HEADER });
    hdrKills.position.set(COL_RIGHT + 240, ry);
    this._statsContainer.addChild(hdrKills);
    ry += 20;

    // Get p1 unit type damage entries, sorted by damage descending
    const p1UnitDmg = stats.unitTypeDamage.get("p1");
    const entries: UnitTypeDamageEntry[] = [];
    if (p1UnitDmg) {
      for (const entry of p1UnitDmg.values()) {
        entries.push(entry);
      }
    }
    entries.sort((a, b) => b.damage - a.damage);

    for (const entry of entries) {
      const unitName = _unitLabel(entry.type);
      const nameText = new Text({ text: unitName, style: STYLE_DMG_UNIT });
      nameText.position.set(COL_RIGHT, ry);
      this._statsContainer.addChild(nameText);

      const dmgText = new Text({ text: _fmtNum(entry.damage), style: STYLE_DMG_VALUE });
      dmgText.position.set(COL_RIGHT + 150, ry);
      this._statsContainer.addChild(dmgText);

      const killsText = new Text({ text: String(entry.kills), style: STYLE_DMG_KILLS });
      killsText.position.set(COL_RIGHT + 240, ry);
      this._statsContainer.addChild(killsText);

      ry += 20;
    }

    if (entries.length === 0) {
      const noData = new Text({ text: "No damage dealt", style: STYLE_STAT_LABEL });
      noData.position.set(COL_RIGHT, ry);
      this._statsContainer.addChild(noData);
      ry += 20;
    }
  }

  private _drawCard(h: number): void {
    this._cardBg.clear();
    this._cardBg
      .roundRect(0, 0, this._CARD_W, h, 10)
      .fill({ color: 0x0a0a18, alpha: 0.96 })
      .roundRect(0, 0, this._CARD_W, h, 10)
      .stroke({ color: 0xffd700, alpha: 0.6, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });

    this._card.position.set(
      Math.floor((sw - this._CARD_W) / 2),
      Math.floor((sh - this._currentCardH) / 2),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _fmtNum(n: number): string {
  return n.toLocaleString();
}

function _unitLabel(u: string): string {
  return u.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const victoryScreen = new VictoryScreen();
