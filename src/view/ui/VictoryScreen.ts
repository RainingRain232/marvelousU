// Overlay shown during RESOLVE phase: winner announcement, stats, unit damage breakdown
import { AnimatedSprite, Container, Graphics, Text, TextStyle, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { GamePhase, GameMode, UnitType, UnitState } from "@/types";
import { battleStatsTracker } from "@sim/systems/BattleStatsTracker";
import type { UnitTypeDamageEntry } from "@sim/systems/BattleStatsTracker";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { animationManager } from "@view/animation/AnimationManager";
import { UNIT_LABELS } from "@view/ui/HoverTooltip";
import type { UnitRoster } from "@view/ui/UnitShopScreen";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_WINNER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 48,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 5,
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
  fontSize: 13,
  fill: 0x8899aa,
  letterSpacing: 1,
});

const STYLE_STAT_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
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


const STYLE_ARMY_SURVIVOR = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0x88ff88,
  letterSpacing: 0,
});

const STYLE_ARMY_DEAD = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xff6655,
  letterSpacing: 0,
});

// Tooltip styles
const TT_W = 240;
const TT_PREVIEW_H = 80;
const TT_PAD = 10;

const STYLE_TT_NAME = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold" });
const STYLE_TT_DESC = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x99aabb, wordWrap: true, wordWrapWidth: TT_W - TT_PAD * 2 });
const STYLE_TT_STAT = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xbbccdd });
const STYLE_TT_ABILITY = new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xcc88ff });

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

  // Tooltip elements
  private _tooltip!: Container;
  private _tooltipBg!: Graphics;
  private _tooltipPreview!: Container;
  private _tooltipStats!: Container;
  private _tooltipSprite: AnimatedSprite | null = null;
  private _activeTooltipUnit: UnitType | null = null;

  private _CARD_W = 900;
  private _currentCardH = 300;

  /** If > 0, this is a wave mode battle. */
  waveNumber = 0;

  /** Corruption level for Grail Greed mode display. */
  corruptionLevel = 0;

  /** Gold spent this round. */
  lastRoundGoldSpent = 0;

  /** Total gold spent across all waves. */
  totalGoldSpent = 0;

  /** AI enemy gold this round. */
  enemyGoldThisRound = 0;

  /** AI enemy gold total across all waves. */
  enemyGoldTotal = 0;

  /** Player roster for the current wave. */
  p1Roster: UnitRoster = [];

  /** Enemy roster for the current wave. */
  p2Roster: UnitRoster = [];

  /** Best wave reached (for game-over display). */
  waveBestRun = 0;

  /** If true, use the enlarged wave-style layout for battlefield mode. */
  isBattlefield = false;

  /** Gold budget each player had in battlefield mode. */
  battlefieldGold = 0;

  /** Called when the player clicks "NEXT WAVE" in wave mode. */
  onNextWave: (() => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private _unsubscribers: Array<() => void> = [];
  private _onResize: (() => void) | null = null;

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    // Winner text
    this._winnerText = new Text({ text: "", style: STYLE_WINNER });
    this._winnerText.anchor.set(0.5, 0);
    this._winnerText.position.set(this._CARD_W / 2, 20);
    this._card.addChild(this._winnerText);

    // Subtitle
    this._subtitleText = new Text({ text: "VICTORY", style: STYLE_SUBTITLE });
    this._subtitleText.anchor.set(0.5, 0);
    this._subtitleText.position.set(this._CARD_W / 2, 76);
    this._card.addChild(this._subtitleText);

    // Divider after header
    this._card.addChild(
      new Graphics()
        .rect(30, 108, this._CARD_W - 60, 1)
        .fill({ color: 0xffd700, alpha: 0.3 }),
    );

    // Stats container (populated dynamically)
    this._statsContainer = new Container();
    this._statsContainer.position.set(0, 118);
    this._card.addChild(this._statsContainer);

    // Return to Menu button
    const BW = 260;
    const BH = 48;

    this._menuBtn = new Container();
    this._menuBtn.eventMode = "static";
    this._menuBtn.cursor = "pointer";

    const btnBg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    this._menuBtn.addChild(btnBg);

    const btnLabel = new Text({ text: "BACK TO MAIN MENU", style: STYLE_BTN });
    btnLabel.style.fill = 0x88ccff;
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BH / 2);
    this._menuBtn.addChild(btnLabel);

    this._menuBtn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    this._menuBtn.on("pointerout", () => { btnBg.tint = 0xffffff; });
    this._menuBtn.on("pointerdown", () => { window.location.reload(); });

    this._card.addChild(this._menuBtn);

    // Next Wave button
    const NW_BW = 260;
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
      this._hideTooltip();
      this.container.visible = false;
      this.onNextWave?.();
    });

    this._card.addChild(this._nextWaveBtn);

    // Tooltip (on top of everything)
    this._tooltip = new Container();
    this._tooltip.visible = false;
    this._tooltipBg = new Graphics();
    this._tooltip.addChild(this._tooltipBg);
    this._tooltipPreview = new Container();
    this._tooltip.addChild(this._tooltipPreview);
    this._tooltipStats = new Container();
    this._tooltipStats.position.set(0, TT_PREVIEW_H);
    this._tooltip.addChild(this._tooltipStats);
    this.container.addChild(this._tooltip);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();

    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);

    this._unsubscribers.push(
      EventBus.on("phaseChanged", ({ phase }) => {
        if (phase === GamePhase.RESOLVE) {
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
    this._hideTooltip();
    const isWave = this.waveNumber > 0;
    const useEnlargedLayout = isWave || this.isBattlefield;
    const p1Won = state.winnerId === "p1";

    // Wave/battlefield mode: fill the screen with padding; normal: fixed 900px card
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    const SCREEN_PAD = 40;
    this._CARD_W = useEnlargedLayout ? Math.max(1100, sw - SCREEN_PAD * 2) : 900;
    this._winnerText.position.set(this._CARD_W / 2, 20);
    this._subtitleText.position.set(this._CARD_W / 2, 76);
    // Redraw header divider
    const divider = this._card.getChildAt(3) as Graphics;
    divider.clear().rect(30, 108, this._CARD_W - 60, 1).fill({ color: 0xffd700, alpha: 0.3 });

    const corruptionTag = this.corruptionLevel > 0
      ? ` — CORRUPTION ${this.corruptionLevel}`
      : "";

    if (state.winnerId === null) {
      this._winnerText.text = "DRAW";
      this._subtitleText.text = isWave
        ? `WAVE ${this.waveNumber}${corruptionTag} — MUTUAL DESTRUCTION`
        : this.isBattlefield
          ? "MUTUAL DESTRUCTION"
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
        ? `WAVE ${this.waveNumber}${corruptionTag} ${p1Won ? "COMPLETE" : "— GAME OVER"}`
        : this.isBattlefield
          ? (p1Won ? "VICTORY" : "DEFEAT")
          : "WINS THE ROUND";
    }

    // Build stats — set card height first for enlarged layout so army lists know their bounds
    const BH = 48;
    if (useEnlargedLayout) {
      this._currentCardH = Math.max(500, sh - SCREEN_PAD * 2);
      this._buildWaveStats(state);
    } else {
      this._buildStats(state);
    }

    // Position buttons at the bottom of the card
    if (useEnlargedLayout) {
      const btnY = this._currentCardH - BH - 20;
      if (isWave && p1Won) {
        this._nextWaveBtn.visible = true;
        this._nextWaveBtn.position.set(this._CARD_W / 2 - 270, btnY);
        this._menuBtn.position.set(this._CARD_W / 2 + 10, btnY);
      } else {
        this._nextWaveBtn.visible = false;
        this._menuBtn.position.set(this._CARD_W / 2 - 130, btnY);
      }
    } else {
      const statsH = this._statsContainer.getBounds().height;
      const btnY = 118 + statsH + 20;
      this._nextWaveBtn.visible = false;
      this._menuBtn.position.set(this._CARD_W / 2 - 130, btnY);
      this._currentCardH = btnY + BH + 24;
    }

    this._drawCard(this._currentCardH);
    this.container.visible = true;
    this._layout();
  }

  // ---------------------------------------------------------------------------
  // Wave stats (enlarged layout with 5 sections)
  // ---------------------------------------------------------------------------

  private _buildWaveStats(state: GameState): void {
    this._statsContainer.removeChildren();
    const stats = battleStatsTracker.getStats();
    const p1Stats = stats.perPlayer.get("p1");
    const p2Stats = stats.perPlayer.get("p2");

    const PAD = 24;
    // 5 columns that distribute evenly across the card width
    const usable = this._CARD_W - PAD * 2;
    const colStep = Math.floor(usable / 5);
    const COL1 = PAD;                       // YOUR STATS + WAVE ECONOMY
    const COL2 = PAD + colStep;             // ENEMY STATS + AI ECONOMY
    const COL3 = PAD + colStep * 2;         // YOUR DAMAGE
    const COL4 = PAD + colStep * 3;         // ENEMY DAMAGE
    const COL5_X = PAD + colStep * 4;       // ARMIES (scrollable)
    const COL_W = colStep - 10;
    const ARMY_W = colStep - 10;

    let ly = 0; // col1 y
    let cy = 0; // col2 y
    let dy1 = 0; // col3 y
    let dy2 = 0; // col4 y

    // --- COLUMN 1: YOUR STATS ---
    this._addSectionLabel("YOUR STATS", COL1, ly);
    ly += 24;

    if (p1Stats) {
      ly = this._addStat("Damage Dealt", _fmtNum(p1Stats.damageDealt), ly, COL1);
      ly = this._addStat("Damage Received", _fmtNum(p1Stats.damageReceived), ly, COL1);
      ly = this._addStat("Kills", _fmtNum(p1Stats.kills), ly, COL1);
      ly = this._addStat("Units Lost", _fmtNum(p1Stats.unitsLost), ly, COL1);
      ly = this._addStat("Units Spawned", _fmtNum(p1Stats.unitsSpawned), ly, COL1);
      ly = this._addStat("Healing Done", _fmtNum(p1Stats.healingDone), ly, COL1);
      ly = this._addStat("Health Regen", _fmtNum(p1Stats.healthRegenerated), ly, COL1);
    }

    // Economy section
    ly += 6;
    this._addDivider(COL1, ly, COL_W);
    ly += 10;

    if (this.waveNumber > 0) {
      this._addSectionLabel("WAVE ECONOMY", COL1, ly);
      ly += 24;
      ly = this._addStat("Gold (This Wave)", _fmtNum(this.lastRoundGoldSpent), ly, COL1);
      ly = this._addStat("Gold (All Waves)", _fmtNum(this.totalGoldSpent), ly, COL1);
    } else {
      this._addSectionLabel("ECONOMY", COL1, ly);
      ly += 24;
      if (this.battlefieldGold > 0) {
        ly = this._addStat("Army Budget", _fmtNum(this.battlefieldGold), ly, COL1);
      }
    }

    let survivorCount = 0;
    for (const u of state.units.values()) {
      if (u.owner === "p1" && u.hp > 0) survivorCount++;
    }
    ly = this._addStat("Surviving Units", String(survivorCount), ly, COL1);
    if (this.waveNumber > 0) {
      ly = this._addStat("Wave Number", String(this.waveNumber), ly, COL1);
    }
    if (this.corruptionLevel > 0) {
      ly = this._addStat("Corruption", String(this.corruptionLevel), ly, COL1);
    }
    if (state.winnerId !== "p1" && this.waveBestRun > 0) {
      ly = this._addStat("Best Run Ever", `Wave ${this.waveBestRun}`, ly, COL1);
    }

    // Battle duration
    ly += 6;
    this._addDivider(COL1, ly, COL_W);
    ly += 10;
    const durationSec = Math.floor(state.tick / 60);
    const durMin = Math.floor(durationSec / 60);
    const durSec = durationSec % 60;
    ly = this._addStat("Battle Duration", `${durMin}m ${durSec}s`, ly, COL1);

    // --- COLUMN 2: ENEMY STATS ---
    this._addSectionLabel("ENEMY STATS", COL2, cy);
    cy += 24;

    if (p2Stats) {
      cy = this._addStat("Damage Dealt", _fmtNum(p2Stats.damageDealt), cy, COL2);
      cy = this._addStat("Damage Received", _fmtNum(p2Stats.damageReceived), cy, COL2);
      cy = this._addStat("Kills", _fmtNum(p2Stats.kills), cy, COL2);
      cy = this._addStat("Units Lost", _fmtNum(p2Stats.unitsLost), cy, COL2);
      cy = this._addStat("Units Spawned", _fmtNum(p2Stats.unitsSpawned), cy, COL2);
      cy = this._addStat("Healing Done", _fmtNum(p2Stats.healingDone), cy, COL2);
      cy = this._addStat("Health Regen", _fmtNum(p2Stats.healthRegenerated), cy, COL2);
    }

    // Enemy Economy
    cy += 6;
    this._addDivider(COL2, cy, COL_W);
    cy += 10;

    if (this.waveNumber > 0) {
      this._addSectionLabel("AI ECONOMY", COL2, cy);
      cy += 24;
      cy = this._addStat("Gold (This Wave)", _fmtNum(this.enemyGoldThisRound), cy, COL2);
      cy = this._addStat("Gold (All Waves)", _fmtNum(this.enemyGoldTotal), cy, COL2);
    } else {
      this._addSectionLabel("ENEMY ECONOMY", COL2, cy);
      cy += 24;
      if (this.battlefieldGold > 0) {
        cy = this._addStat("Army Budget", _fmtNum(this.battlefieldGold), cy, COL2);
      }
    }

    let enemySurvivorCount = 0;
    for (const u of state.units.values()) {
      if (u.owner === "p2" && u.hp > 0) enemySurvivorCount++;
    }
    cy = this._addStat("Surviving Units", String(enemySurvivorCount), cy, COL2);

    // --- COLUMN 3: YOUR UNIT DAMAGE ---
    this._addSectionLabel("YOUR DAMAGE", COL3, dy1);
    dy1 += 24;
    dy1 = this._buildDamageColumn(stats.unitTypeDamage.get("p1"), COL3, dy1, COL_W);

    // --- COLUMN 4: ENEMY UNIT DAMAGE ---
    this._addSectionLabel("ENEMY DAMAGE", COL4, dy2);
    dy2 += 24;
    dy2 = this._buildDamageColumn(stats.unitTypeDamage.get("p2"), COL4, dy2, COL_W);

    // --- COLUMN 5: ARMIES (scrollable lists) ---
    this._buildArmyLists(state, COL5_X, ARMY_W, Math.max(ly, cy, dy1, dy2));
  }

  private _buildDamageColumn(
    unitDmgMap: Map<string, UnitTypeDamageEntry> | undefined,
    colX: number,
    startY: number,
    colW: number,
  ): number {
    let y = startY;
    const ROW_H = 20;

    // Position DMG and KILLS at the right side of the column
    const dmgX = colX + colW - 110;
    const killsX = colX + colW - 40;

    // Header
    const hdrUnit = new Text({ text: "UNIT", style: STYLE_DMG_HEADER });
    hdrUnit.position.set(colX, y);
    this._statsContainer.addChild(hdrUnit);
    const hdrDmg = new Text({ text: "DMG", style: STYLE_DMG_HEADER });
    hdrDmg.position.set(dmgX, y);
    this._statsContainer.addChild(hdrDmg);
    const hdrKills = new Text({ text: "KILLS", style: STYLE_DMG_HEADER });
    hdrKills.position.set(killsX, y);
    this._statsContainer.addChild(hdrKills);
    y += 18;

    this._addDivider(colX, y, colW);
    y += 6;

    const entries: UnitTypeDamageEntry[] = [];
    if (unitDmgMap) {
      for (const entry of unitDmgMap.values()) entries.push(entry);
    }
    entries.sort((a, b) => b.damage - a.damage);

    for (const entry of entries) {
      const row = new Container();
      row.position.set(colX, y);
      row.eventMode = "static";
      row.cursor = "pointer";

      const rowBg = new Graphics()
        .roundRect(0, 0, colW, ROW_H, 2)
        .fill({ color: 0x111122, alpha: 0.01 });
      row.addChild(rowBg);

      const nameText = new Text({ text: _unitLabel(entry.type), style: STYLE_DMG_UNIT });
      nameText.position.set(0, 1);
      row.addChild(nameText);

      const dmgText = new Text({ text: _fmtNum(entry.damage), style: STYLE_DMG_VALUE });
      dmgText.position.set(dmgX - colX, 1);
      row.addChild(dmgText);

      const killsText = new Text({ text: String(entry.kills), style: STYLE_DMG_KILLS });
      killsText.position.set(killsX - colX, 1);
      row.addChild(killsText);

      row.on("pointerover", (e) => {
        rowBg.clear().roundRect(0, 0, colW, ROW_H, 2).fill({ color: 0x1a2244, alpha: 0.8 });
        this._showTooltip(entry.type as UnitType, e.globalX, e.globalY);
      });
      row.on("pointermove", (e) => {
        if (this._activeTooltipUnit === entry.type) this._positionTooltip(e.globalX, e.globalY);
      });
      row.on("pointerout", () => {
        rowBg.clear().roundRect(0, 0, colW, ROW_H, 2).fill({ color: 0x111122, alpha: 0.01 });
        this._hideTooltip();
      });

      this._statsContainer.addChild(row);
      y += ROW_H;
    }

    if (entries.length === 0) {
      const noData = new Text({ text: "No damage dealt", style: STYLE_STAT_LABEL });
      noData.position.set(colX, y);
      this._statsContainer.addChild(noData);
      y += ROW_H;
    }

    return y;
  }

  private _buildArmyLists(state: GameState, colX: number, armyW: number, _maxOtherH: number): void {
    // Use the full available height: card height minus header (118) minus stats offset minus button area (80)
    const ARMY_LIST_H = Math.max(200, this._currentCardH - 118 - 80);
    const ROW_H = 22;

    // --- YOUR ARMY ---
    this._addSectionLabel("YOUR ARMY", colX, 0);

    const p1ListBg = new Graphics()
      .roundRect(colX, 24, armyW, ARMY_LIST_H / 2 - 16, 4)
      .fill({ color: 0x0a0a20, alpha: 0.6 })
      .roundRect(colX, 24, armyW, ARMY_LIST_H / 2 - 16, 4)
      .stroke({ color: 0x334455, alpha: 0.4, width: 1 });
    this._statsContainer.addChild(p1ListBg);

    // Scroll container with mask
    const p1Scroll = new Container();
    const p1Mask = new Graphics().rect(colX, 24, armyW, ARMY_LIST_H / 2 - 16).fill({ color: 0xffffff });
    p1Scroll.mask = p1Mask;
    this._statsContainer.addChild(p1Mask);
    this._statsContainer.addChild(p1Scroll);

    let p1y = 28;
    // Build surviving unit lookup
    const survivingTypes = new Map<string, number>();
    for (const u of state.units.values()) {
      if (u.owner === "p1" && u.hp > 0) {
        survivingTypes.set(u.type, (survivingTypes.get(u.type) ?? 0) + 1);
      }
    }

    for (const entry of this.p1Roster) {
      const survived = survivingTypes.get(entry.type) ?? 0;
      const dead = entry.count - survived;
      const label = _unitLabel(entry.type);
      let text = `${label} x${entry.count}`;
      if (survived > 0 && dead > 0) text = `${label} x${entry.count} (${survived} alive)`;
      const style = survived > 0 ? STYLE_ARMY_SURVIVOR : STYLE_ARMY_DEAD;

      const row = new Container();
      row.position.set(colX + 6, p1y);
      row.eventMode = "static";
      row.cursor = "pointer";

      const rowBg = new Graphics()
        .roundRect(0, 0, armyW - 12, ROW_H, 2)
        .fill({ color: 0x111122, alpha: 0.01 });
      row.addChild(rowBg);

      const txt = new Text({ text, style });
      txt.position.set(4, 2);
      row.addChild(txt);

      row.on("pointerover", (e) => {
        rowBg.clear().roundRect(0, 0, armyW - 12, ROW_H, 2).fill({ color: 0x1a2244, alpha: 0.8 });
        this._showTooltip(entry.type as UnitType, e.globalX, e.globalY);
      });
      row.on("pointermove", (e) => {
        if (this._activeTooltipUnit === entry.type) this._positionTooltip(e.globalX, e.globalY);
      });
      row.on("pointerout", () => {
        rowBg.clear().roundRect(0, 0, armyW - 12, ROW_H, 2).fill({ color: 0x111122, alpha: 0.01 });
        this._hideTooltip();
      });

      p1Scroll.addChild(row);
      p1y += ROW_H;
    }

    // Scroll handling for p1
    const p1ContentH = p1y - 28;
    const p1ViewH = ARMY_LIST_H / 2 - 16;
    this._addScrollHandling(p1ListBg, p1Scroll, p1ContentH, p1ViewH, 28);

    // --- ENEMY ARMY ---
    const enemyStartY = ARMY_LIST_H / 2 + 14;
    this._addSectionLabel("ENEMY ARMY", colX, enemyStartY);

    const p2ListBg = new Graphics()
      .roundRect(colX, enemyStartY + 24, armyW, ARMY_LIST_H / 2 - 16, 4)
      .fill({ color: 0x200a0a, alpha: 0.6 })
      .roundRect(colX, enemyStartY + 24, armyW, ARMY_LIST_H / 2 - 16, 4)
      .stroke({ color: 0x553344, alpha: 0.4, width: 1 });
    this._statsContainer.addChild(p2ListBg);

    const p2Scroll = new Container();
    const p2Mask = new Graphics().rect(colX, enemyStartY + 24, armyW, ARMY_LIST_H / 2 - 16).fill({ color: 0xffffff });
    p2Scroll.mask = p2Mask;
    this._statsContainer.addChild(p2Mask);
    this._statsContainer.addChild(p2Scroll);

    // Build enemy surviving unit lookup
    const enemySurvivingTypes = new Map<string, number>();
    for (const u of state.units.values()) {
      if (u.owner === "p2" && u.hp > 0) {
        enemySurvivingTypes.set(u.type, (enemySurvivingTypes.get(u.type) ?? 0) + 1);
      }
    }

    let p2y = enemyStartY + 28;
    for (const entry of this.p2Roster) {
      const survived = enemySurvivingTypes.get(entry.type) ?? 0;
      const dead = entry.count - survived;
      const label = _unitLabel(entry.type);
      let text = `${label} x${entry.count}`;
      if (survived > 0 && dead > 0) text = `${label} x${entry.count} (${survived} alive)`;
      const style = survived > 0 ? STYLE_ARMY_SURVIVOR : STYLE_ARMY_DEAD;

      const row = new Container();
      row.position.set(colX + 6, p2y);
      row.eventMode = "static";
      row.cursor = "pointer";

      const rowBg = new Graphics()
        .roundRect(0, 0, armyW - 12, ROW_H, 2)
        .fill({ color: 0x221111, alpha: 0.01 });
      row.addChild(rowBg);

      const txt = new Text({ text, style });
      txt.position.set(4, 2);
      row.addChild(txt);

      row.on("pointerover", (e) => {
        rowBg.clear().roundRect(0, 0, armyW - 12, ROW_H, 2).fill({ color: 0x2a1a1a, alpha: 0.8 });
        this._showTooltip(entry.type as UnitType, e.globalX, e.globalY);
      });
      row.on("pointermove", (e) => {
        if (this._activeTooltipUnit === entry.type) this._positionTooltip(e.globalX, e.globalY);
      });
      row.on("pointerout", () => {
        rowBg.clear().roundRect(0, 0, armyW - 12, ROW_H, 2).fill({ color: 0x221111, alpha: 0.01 });
        this._hideTooltip();
      });

      p2Scroll.addChild(row);
      p2y += ROW_H;
    }

    const p2ContentH = p2y - (enemyStartY + 28);
    const p2ViewH = ARMY_LIST_H / 2 - 16;
    this._addScrollHandling(p2ListBg, p2Scroll, p2ContentH, p2ViewH, enemyStartY + 28);
  }

  private _addScrollHandling(
    hitArea: Graphics,
    scrollContent: Container,
    contentH: number,
    viewH: number,
    _topOffset: number,
  ): void {
    if (contentH <= viewH) return;
    let scrollY = 0;
    const maxScroll = contentH - viewH;
    hitArea.eventMode = "static";
    hitArea.on("wheel", (e: WheelEvent) => {
      scrollY = Math.min(maxScroll, Math.max(0, scrollY + e.deltaY * 0.5));
      scrollContent.y = -scrollY;
    });
  }

  // ---------------------------------------------------------------------------
  // Non-wave stats (original layout)
  // ---------------------------------------------------------------------------

  private _buildStats(state: GameState): void {
    this._statsContainer.removeChildren();
    const stats = battleStatsTracker.getStats();
    const p1Stats = stats.perPlayer.get("p1");
    const p2Stats = stats.perPlayer.get("p2");

    const PAD = 36;
    const COL1 = PAD;
    const COL2 = 310;
    const COL3 = 560;
    let ly = 0;
    let cy = 0;
    let ry = 0;

    // --- COLUMN 1: P1 Battle Stats ---
    this._addSectionLabel("YOUR STATS", COL1, ly);
    ly += 28;

    if (p1Stats) {
      ly = this._addStat("Damage Dealt", _fmtNum(p1Stats.damageDealt), ly, COL1);
      ly = this._addStat("Damage Received", _fmtNum(p1Stats.damageReceived), ly, COL1);
      ly = this._addStat("Kills", _fmtNum(p1Stats.kills), ly, COL1);
      ly = this._addStat("Units Lost", _fmtNum(p1Stats.unitsLost), ly, COL1);
      ly = this._addStat("Units Spawned", _fmtNum(p1Stats.unitsSpawned), ly, COL1);
      ly = this._addStat("Healing Done", _fmtNum(p1Stats.healingDone), ly, COL1);
      ly = this._addStat("Health Regen", _fmtNum(p1Stats.healthRegenerated), ly, COL1);
    }

    // --- COLUMN 2: Enemy Stats ---
    this._addSectionLabel("ENEMY STATS", COL2, cy);
    cy += 28;

    if (p2Stats) {
      cy = this._addStat("Damage Dealt", _fmtNum(p2Stats.damageDealt), cy, COL2);
      cy = this._addStat("Damage Received", _fmtNum(p2Stats.damageReceived), cy, COL2);
      cy = this._addStat("Kills", _fmtNum(p2Stats.kills), cy, COL2);
      cy = this._addStat("Units Lost", _fmtNum(p2Stats.unitsLost), cy, COL2);
      cy = this._addStat("Units Spawned", _fmtNum(p2Stats.unitsSpawned), cy, COL2);
      cy = this._addStat("Healing Done", _fmtNum(p2Stats.healingDone), cy, COL2);
      cy = this._addStat("Health Regen", _fmtNum(p2Stats.healthRegenerated), cy, COL2);
    }

    cy += 8;
    this._addDivider(COL2, cy, 220);
    cy += 12;
    const durationSec2 = Math.floor(state.tick / 60);
    const durMin2 = Math.floor(durationSec2 / 60);
    const durSec2 = durationSec2 % 60;
    cy = this._addStat("Battle Duration", `${durMin2}m ${durSec2}s`, cy, COL2);
    cy = this._addStat("Total Units", _fmtNum(stats.totalUnitsSpawned), cy, COL2);

    // --- COLUMN 3: Unit Damage Breakdown ---
    this._addSectionLabel("UNIT DAMAGE", COL3, ry);
    ry += 28;
    this._buildDamageColumn(stats.unitTypeDamage.get("p1"), COL3, ry, 300);
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _showTooltip(ut: UnitType, gx: number, gy: number): void {
    this._activeTooltipUnit = ut;
    const def = UNIT_DEFINITIONS[ut];
    if (!def) return;

    this._tooltipPreview.removeChildren();
    this._tooltipStats.removeChildren();
    if (this._tooltipSprite) { this._tooltipSprite.stop(); this._tooltipSprite = null; }

    const frames = animationManager.getFrames(ut, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 56; sprite.height = 56;
      sprite.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      const frameSet = animationManager.getFrameSet(ut, UnitState.IDLE);
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true; sprite.play();
      this._tooltipSprite = sprite;
      this._tooltipPreview.addChild(sprite);
    } else {
      const g = new Graphics()
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22).fill({ color: 0x334466 })
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22).stroke({ color: 0x5588aa, width: 1 });
      this._tooltipPreview.addChild(g);
      const letter = new Text({
        text: (UNIT_LABELS[ut] ?? ut).charAt(0),
        style: new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xdddddd, fontWeight: "bold" }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      this._tooltipPreview.addChild(letter);
    }

    let sy = TT_PAD;
    const tier = def.tier ?? computeTier(def.cost);
    const nameLabel = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");

    const nameTxt = new Text({ text: `${nameLabel}  T${tier}`, style: STYLE_TT_NAME });
    nameTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(nameTxt); sy += 18;

    if (def.description) {
      const descTxt = new Text({ text: def.description, style: STYLE_TT_DESC });
      descTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(descTxt); sy += descTxt.height + 6;
    }

    const line1 = new Text({ text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed.toFixed(1)}`, style: STYLE_TT_STAT });
    line1.position.set(TT_PAD, sy); this._tooltipStats.addChild(line1); sy += 14;
    const line2 = new Text({ text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`, style: STYLE_TT_STAT });
    line2.position.set(TT_PAD, sy); this._tooltipStats.addChild(line2); sy += 14;

    if (def.abilityTypes.length > 0) {
      const abilTxt = new Text({ text: def.abilityTypes.join(", "), style: STYLE_TT_ABILITY });
      abilTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(abilTxt); sy += 14;
    }

    const tags: string[] = [];
    if (def.isChargeUnit) tags.push("Charge");
    if (def.isHealer) tags.push("Healer");
    if (def.siegeOnly) tags.push("Siege Only");
    if (tags.length > 0) {
      const tagTxt = new Text({ text: tags.join(" | "), style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xccaa66 }) });
      tagTxt.position.set(TT_PAD, sy); this._tooltipStats.addChild(tagTxt); sy += 14;
    }

    const totalH = TT_PREVIEW_H + sy + TT_PAD;
    this._tooltipBg.clear()
      .roundRect(0, 0, TT_W, totalH, 6).fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, totalH, 6).stroke({ color: 0xffd700, alpha: 0.55, width: 1.5 });

    this._positionTooltip(gx, gy);
    this._tooltip.visible = true;
  }

  private _positionTooltip(gx: number, gy: number): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    let tx = gx + 16; let ty = gy - 20;
    if (tx + TT_W > sw - 10) tx = gx - TT_W - 16;
    if (ty < 10) ty = 10;
    const ttH = this._tooltipBg.height || 200;
    if (ty + ttH > sh - 10) ty = sh - ttH - 10;
    this._tooltip.position.set(tx, ty);
  }

  private _hideTooltip(): void {
    this._tooltip.visible = false;
    this._activeTooltipUnit = null;
    if (this._tooltipSprite) { this._tooltipSprite.stop(); this._tooltipSprite = null; }
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private _addSectionLabel(text: string, x: number, y: number): void {
    const lbl = new Text({ text, style: STYLE_SECTION_LABEL });
    lbl.position.set(x, y);
    this._statsContainer.addChild(lbl);
  }

  private _addDivider(x: number, y: number, w: number): void {
    this._statsContainer.addChild(
      new Graphics().rect(x, y, w, 1).fill({ color: 0xffd700, alpha: 0.15 }),
    );
  }

  private _addStat(label: string, value: string, y: number, col: number): number {
    const lbl = new Text({ text: label, style: STYLE_STAT_LABEL });
    lbl.position.set(col, y);
    this._statsContainer.addChild(lbl);

    const val = new Text({ text: value, style: STYLE_STAT_VALUE });
    val.position.set(col + 160, y);
    this._statsContainer.addChild(val);
    return y + 22;
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
      Math.max(10, Math.floor((sh - this._currentCardH) / 2)),
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
