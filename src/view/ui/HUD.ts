// Gold display, phase indicator, unit count — lives in the ui layer (no camera transform)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { GameMode, GamePhase } from "@/types";
import type { PlayerId } from "@/types";
import { ResourceType } from "@sim/entities/ResourceNode";

// ---------------------------------------------------------------------------
// Layout constants (all in screen pixels, anchored to top-left / top-right)
// ---------------------------------------------------------------------------

const PAD = 12; // outer padding from screen edge
const PANEL_H = 56;
const PANEL_W = 220;
const CORNER_R = 6;
const BG_COLOR = 0x0a0a18;
const BG_ALPHA = 0.78;
const BORDER_COLOR = 0xffd700; // gold border
const BORDER_W = 1.5;

// Text styles
const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x8899aa,
  letterSpacing: 1,
});
const STYLE_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xffffff,
  fontWeight: "bold",
});
const STYLE_MANA_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x5588cc,
  letterSpacing: 1,
});
const STYLE_MANA_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0x4488ff,
  fontWeight: "bold",
});
const STYLE_WOOD_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x55aa55,
  letterSpacing: 1,
});
const STYLE_WOOD_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0x44cc44,
  fontWeight: "bold",
});
const STYLE_STONE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x888899,
  letterSpacing: 1,
});
const STYLE_STONE_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xaaaacc,
  fontWeight: "bold",
});
const STYLE_PHASE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

// Phase display strings
const PHASE_LABELS: Record<string, string> = {
  prep: "PREP",
  battle: "BATTLE",
  resolve: "RESOLVE",
  rts_active: "RTS",
};

// Button style shared by AI toggle and START BATTLE
const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 1,
});

// ---------------------------------------------------------------------------
// Small helper: builds a rounded-rect panel with border
// ---------------------------------------------------------------------------

function makePanel(w: number, h: number): Container {
  const c = new Container();
  c.addChild(
    new Graphics()
      .roundRect(0, 0, w, h, CORNER_R)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, w, h, CORNER_R)
      .stroke({ color: BORDER_COLOR, alpha: 0.5, width: BORDER_W }),
  );
  return c;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

/**
 * Renders three persistent info panels in the `ui` layer:
 *
 *   [TOP-LEFT]   West player gold + unit count
 *   [TOP-CENTER] Game phase
 *   [TOP-RIGHT]  East player gold + unit count
 *
 * Usage:
 *   hud.init(vm, state, { westPlayerId: "p1", eastPlayerId: "p2" });
 *   vm.onUpdate((s) => hud.update(s));   // sync unit counts each frame
 *   hud.destroy();
 */
export class HUD {
  readonly container = new Container();

  // West panel
  private _westPanel!: Container;
  private _westGoldVal!: Text;
  private _westManaVal!: Text;
  private _westUnitVal!: Text;
  private _westWoodVal!: Text;
  private _westStoneVal!: Text;

  // East panel
  private _eastPanel!: Container;
  private _eastGoldVal!: Text;
  private _eastManaVal!: Text;
  private _eastUnitVal!: Text;
  private _eastWoodVal!: Text;
  private _eastStoneVal!: Text;

  // Phase panel
  private _phasePanel!: Container;
  private _phaseText!: Text;

  // Player-switcher button (below west panel, visible only when P2 is human)
  private _switchBtn!: Container;
  private _switchBtnBg!: Graphics;
  private _switchBtnLabel!: Text;
  private _activePlayer: PlayerId = "p1";
  private _p2IsAI = true;

  // START BATTLE button (below phase panel, visible only during PREP)
  private _startBattleBtn!: Container;
  private _currentPhase: GamePhase = GamePhase.PREP;

  // Speed label (shown briefly when game speed changes)
  private _speedLabel!: Text;
  private _speedLabelTimer = 0;

  private _westPlayerId: PlayerId = "";
  private _eastPlayerId: PlayerId = "";
  private _screenW = 800;
  private _gameMode: GameMode = GameMode.STANDARD;

  private _unsubscribers: Array<() => void> = [];

  // Callbacks set by main.ts
  onAIToggle: ((isAI: boolean) => void) | null = null;
  onStartBattle: (() => void) | null = null;
  onSwitchPlayer: ((playerId: PlayerId) => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(
    vm: ViewManager,
    state: GameState,
    ids: { westPlayerId: PlayerId; eastPlayerId: PlayerId },
  ): void {
    this._westPlayerId = ids.westPlayerId;
    this._eastPlayerId = ids.eastPlayerId;
    this._screenW = vm.screenWidth;
    this._gameMode = state.gameMode;
    this._state = state;

    this._buildWestPanel();
    this._buildEastPanel();
    this._buildPhasePanel();
    // this._buildAIToggleBtn(); // Removed - AI toggle no longer appears in game
    this._buildSwitchBtn();
    this._buildStartBattleBtn();
    this._buildSpeedLabel();

    vm.addToLayer("ui", this.container);

    // Listen to sim events for immediate updates
    this._unsubscribers.push(
      EventBus.on("goldChanged", ({ playerId, amount }) => {
        this._setGold(playerId, amount);
      }),
      EventBus.on("manaChanged", ({ playerId, amount }) => {
        this._setMana(playerId, amount);
      }),
      EventBus.on("phaseChanged", ({ phase }) => {
        this._setPhase(phase);
      }),
      EventBus.on("resourceDelivered", ({ playerId, resourceType, amount }) => {
        this._setResource(playerId, resourceType, amount);
      }),
    );

    // Sync to current state immediately
    this._syncFromState(state);

    // Reposition on resize
    const onResize = () => {
      this._screenW = vm.screenWidth;
      this._repositionEastPanel();
      this._repositionPhasePanel();
      // this._repositionAIToggle(); // Removed - AI toggle no longer appears
      this._repositionSwitchBtn();
      this._repositionStartBattleBtn();
    };
    vm.app.renderer.on("resize", onResize);
    this._unsubscribers.push(() => vm.app.renderer.off("resize", onResize));
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Per-frame update — syncs unit counts (gold is event-driven)
  // ---------------------------------------------------------------------------

  readonly update = (state: GameState): void => {
    const westUnits = this._countUnits(state, this._westPlayerId);
    const eastUnits = this._countUnits(state, this._eastPlayerId);
    this._westUnitVal.text = String(westUnits);
    this._eastUnitVal.text = String(eastUnits);

    // RTS: sync wood/stone
    if (this._gameMode === GameMode.RTS) {
      const west = state.players.get(this._westPlayerId);
      const east = state.players.get(this._eastPlayerId);
      if (west && this._westWoodVal) this._westWoodVal.text = String(west.wood);
      if (west && this._westStoneVal) this._westStoneVal.text = String(west.stone);
      if (east && this._eastWoodVal) this._eastWoodVal.text = String(east.wood);
      if (east && this._eastStoneVal) this._eastStoneVal.text = String(east.stone);
    }

    // Fade out speed label
    if (this._speedLabelTimer > 0) {
      this._speedLabelTimer -= 1 / 60; // approximate per-frame
      if (this._speedLabelTimer <= 0) {
        this._speedLabel.visible = false;
      } else if (this._speedLabelTimer < 0.5) {
        this._speedLabel.alpha = this._speedLabelTimer / 0.5;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Private builders
  // ---------------------------------------------------------------------------

  private _buildWestPanel(): void {
    const isRTS = this._gameMode === GameMode.RTS;
    const panelW = isRTS ? 340 : PANEL_W;
    this._westPanel = makePanel(panelW, PANEL_H);
    this._westPanel.position.set(PAD, PAD);

    const goldLabel = new Text({ text: "GOLD", style: STYLE_LABEL });
    goldLabel.position.set(10, 8);

    this._westGoldVal = new Text({ text: "0", style: STYLE_VALUE });
    this._westGoldVal.position.set(10, 24);

    const manaLabel = new Text({ text: "MANA", style: STYLE_MANA_LABEL });
    manaLabel.position.set(60, 8);

    this._westManaVal = new Text({ text: "0", style: STYLE_MANA_VALUE });
    this._westManaVal.position.set(60, 24);

    this._westPanel.addChild(goldLabel);
    this._westPanel.addChild(this._westGoldVal);
    this._westPanel.addChild(manaLabel);
    this._westPanel.addChild(this._westManaVal);

    if (isRTS) {
      const woodLabel = new Text({ text: "WOOD", style: STYLE_WOOD_LABEL });
      woodLabel.position.set(110, 8);
      this._westWoodVal = new Text({ text: "0", style: STYLE_WOOD_VALUE });
      this._westWoodVal.position.set(110, 24);

      const stoneLabel = new Text({ text: "STONE", style: STYLE_STONE_LABEL });
      stoneLabel.position.set(160, 8);
      this._westStoneVal = new Text({ text: "0", style: STYLE_STONE_VALUE });
      this._westStoneVal.position.set(160, 24);

      this._westPanel.addChild(woodLabel);
      this._westPanel.addChild(this._westWoodVal);
      this._westPanel.addChild(stoneLabel);
      this._westPanel.addChild(this._westStoneVal);
    }

    const unitLabel = new Text({ text: "UNITS", style: STYLE_LABEL });
    unitLabel.position.set(isRTS ? 220 : 130, 8);

    this._westUnitVal = new Text({ text: "0", style: STYLE_VALUE });
    this._westUnitVal.position.set(isRTS ? 220 : 130, 24);

    this._westPanel.addChild(unitLabel);
    this._westPanel.addChild(this._westUnitVal);
    this.container.addChild(this._westPanel);
  }

  private _buildEastPanel(): void {
    const isRTS = this._gameMode === GameMode.RTS;
    const panelW = isRTS ? 340 : PANEL_W;
    this._eastPanel = makePanel(panelW, PANEL_H);
    this._eastPanel.position.y = PAD;

    const goldLabel = new Text({ text: "GOLD", style: STYLE_LABEL });
    goldLabel.position.set(10, 8);

    this._eastGoldVal = new Text({ text: "0", style: STYLE_VALUE });
    this._eastGoldVal.position.set(10, 24);

    const eastManaLabel = new Text({ text: "MANA", style: STYLE_MANA_LABEL });
    eastManaLabel.position.set(60, 8);

    this._eastManaVal = new Text({ text: "0", style: STYLE_MANA_VALUE });
    this._eastManaVal.position.set(60, 24);

    this._eastPanel.addChild(goldLabel);
    this._eastPanel.addChild(this._eastGoldVal);
    this._eastPanel.addChild(eastManaLabel);
    this._eastPanel.addChild(this._eastManaVal);

    if (isRTS) {
      const woodLabel = new Text({ text: "WOOD", style: STYLE_WOOD_LABEL });
      woodLabel.position.set(110, 8);
      this._eastWoodVal = new Text({ text: "0", style: STYLE_WOOD_VALUE });
      this._eastWoodVal.position.set(110, 24);

      const stoneLabel = new Text({ text: "STONE", style: STYLE_STONE_LABEL });
      stoneLabel.position.set(160, 8);
      this._eastStoneVal = new Text({ text: "0", style: STYLE_STONE_VALUE });
      this._eastStoneVal.position.set(160, 24);

      this._eastPanel.addChild(woodLabel);
      this._eastPanel.addChild(this._eastWoodVal);
      this._eastPanel.addChild(stoneLabel);
      this._eastPanel.addChild(this._eastStoneVal);
    }

    const unitLabel = new Text({ text: "UNITS", style: STYLE_LABEL });
    unitLabel.position.set(isRTS ? 220 : 130, 8);

    this._eastUnitVal = new Text({ text: "0", style: STYLE_VALUE });
    this._eastUnitVal.position.set(isRTS ? 220 : 130, 24);

    this._eastPanel.addChild(unitLabel);
    this._eastPanel.addChild(this._eastUnitVal);
    this.container.addChild(this._eastPanel);

    this._repositionEastPanel();
  }

  private _buildPhasePanel(): void {
    const w = 140;
    const h = 36;
    this._phasePanel = makePanel(w, h);

    this._phaseText = new Text({ text: "PREP", style: STYLE_PHASE });
    this._phaseText.anchor.set(0.5, 0.5);
    this._phaseText.position.set(w / 2, h / 2);

    this._phasePanel.addChild(this._phaseText);
    this.container.addChild(this._phasePanel);

    this._repositionPhasePanel();
  }

  // ---------------------------------------------------------------------------
  // Repositioning (called on init + resize)
  // ---------------------------------------------------------------------------

  private _repositionEastPanel(): void {
    const panelW = this._gameMode === GameMode.RTS ? 340 : PANEL_W;
    this._eastPanel.position.x = this._screenW - panelW - PAD;
  }

  private _repositionPhasePanel(): void {
    const w = 140;
    this._phasePanel.position.set(Math.floor((this._screenW - w) / 2), PAD);
  }

  // ---------------------------------------------------------------------------
  // State sync helpers
  // ---------------------------------------------------------------------------

  private _syncFromState(state: GameState): void {
    const west = state.players.get(this._westPlayerId);
    const east = state.players.get(this._eastPlayerId);
    if (west) {
      this._westGoldVal.text = String(west.gold);
      this._westManaVal.text = String(west.mana);
      if (this._westWoodVal) this._westWoodVal.text = String(west.wood);
      if (this._westStoneVal) this._westStoneVal.text = String(west.stone);
    }
    if (east) {
      this._eastGoldVal.text = String(east.gold);
      this._eastManaVal.text = String(east.mana);
      if (this._eastWoodVal) this._eastWoodVal.text = String(east.wood);
      if (this._eastStoneVal) this._eastStoneVal.text = String(east.stone);
    }
    this._setPhase(state.phase);
    this.update(state);
  }

  /** Sync the AI toggle button to a known state (e.g. set from the menu). */
  setP2AI(isAI: boolean): void {
    this._p2IsAI = isAI;
    if (isAI) {
      this._activePlayer = this._westPlayerId;
    }
    this._refreshSwitchBtn();
  }

  /** Sync the active player indicator (called from main.ts after a switch). */
  setActivePlayer(playerId: PlayerId): void {
    this._activePlayer = playerId;
    this._refreshSwitchBtn();
  }

  private _setGold(playerId: PlayerId, amount: number): void {
    if (playerId === this._westPlayerId) {
      this._westGoldVal.text = String(amount);
    } else if (playerId === this._eastPlayerId) {
      this._eastGoldVal.text = String(amount);
    }
  }

  private _setMana(playerId: PlayerId, amount: number): void {
    if (playerId === this._westPlayerId) {
      this._westManaVal.text = String(amount);
    } else if (playerId === this._eastPlayerId) {
      this._eastManaVal.text = String(amount);
    }
  }

  private _setResource(playerId: PlayerId, resourceType: ResourceType, _amount: number): void {
    const player = playerId === this._westPlayerId
      ? { woodVal: this._westWoodVal, stoneVal: this._westStoneVal }
      : playerId === this._eastPlayerId
        ? { woodVal: this._eastWoodVal, stoneVal: this._eastStoneVal }
        : null;
    if (!player) return;

    const ps = this._state?.players.get(playerId);
    if (!ps) return;
    if (resourceType === ResourceType.WOOD && player.woodVal) player.woodVal.text = String(ps.wood);
    if (resourceType === ResourceType.STONE && player.stoneVal) player.stoneVal.text = String(ps.stone);
    if (resourceType === ResourceType.GOLD) this._setGold(playerId, ps.gold);
  }

  private _state: GameState | null = null;

  private _setPhase(phase: GamePhase): void {
    this._currentPhase = phase;
    this._phaseText.text = PHASE_LABELS[phase] ?? phase.toUpperCase();
    if (this._startBattleBtn) {
      this._startBattleBtn.visible = phase === GamePhase.PREP;
    }
  }

  private _countUnits(state: GameState, playerId: PlayerId): number {
    let count = 0;
    for (const unit of state.units.values()) {
      if (unit.owner === playerId) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Player-switcher button — sits below the west (p1) panel, visible when P2 human
  // ---------------------------------------------------------------------------

  private _buildSwitchBtn(): void {
    const W = PANEL_W;
    const H = 28;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    btn.addChild(bg);

    const label = new Text({ text: "", style: STYLE_BTN });
    label.anchor.set(0.5, 0.5);
    label.position.set(W / 2, H / 2);
    btn.addChild(label);

    this._switchBtnBg = bg;
    this._switchBtnLabel = label;
    this._switchBtn = btn;
    this.container.addChild(btn);

    this._refreshSwitchBtn();

    btn.on("pointerdown", () => {
      this._activePlayer =
        this._activePlayer === this._westPlayerId
          ? this._eastPlayerId
          : this._westPlayerId;
      this._refreshSwitchBtn();
      this.onSwitchPlayer?.(this._activePlayer);
    });

    this._repositionSwitchBtn();
  }

  private _refreshSwitchBtn(): void {
    if (!this._switchBtn) return;
    const W = PANEL_W;
    const H = 28;
    const isP1Active = this._activePlayer === this._westPlayerId;
    const visible = !this._p2IsAI; // Only show when P2 is human (both players human)
    this._switchBtn.visible = visible;
    if (!visible) return;
    this._switchBtnBg.clear();
    this._switchBtnBg
      .roundRect(0, 0, W, H, 4)
      .fill({ color: isP1Active ? 0x1a2a3a : 0x2a1a2a })
      .roundRect(0, 0, W, H, 4)
      .stroke({ color: isP1Active ? 0x4488cc : 0xaa44cc, width: 1.5 });
    this._switchBtnLabel.text = isP1Active
      ? "CONTROLLING: P1  [click→P2]"
      : "CONTROLLING: P2  [click→P1]";
    this._switchBtnLabel.style.fill = isP1Active ? 0x88ccff : 0xee88ff;
  }

  private _repositionSwitchBtn(): void {
    if (!this._switchBtn) return;
    this._switchBtn.position.set(PAD, PAD + PANEL_H + 6);
  }

  // ---------------------------------------------------------------------------
  // START BATTLE button — sits below the phase panel, PREP only
  // ---------------------------------------------------------------------------

  private _buildStartBattleBtn(): void {
    const W = 140;
    const H = 28;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, W, H, 4)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, W, H, 4)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const label = new Text({ text: "START BATTLE", style: STYLE_BTN });
    label.style.fill = 0x88ccff;
    label.anchor.set(0.5, 0.5);
    label.position.set(W / 2, H / 2);
    btn.addChild(label);

    btn.on("pointerover", () => {
      bg.tint = 0xaaddff;
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
    });
    btn.on("pointerdown", () => {
      this.onStartBattle?.();
    });

    this._startBattleBtn = btn;
    this._startBattleBtn.visible = this._currentPhase === GamePhase.PREP;
    this.container.addChild(btn);
    this._repositionStartBattleBtn();
  }

  private _repositionStartBattleBtn(): void {
    if (!this._startBattleBtn) return;
    const W = 140;
    this._startBattleBtn.position.set(
      Math.floor((this._screenW - W) / 2),
      PAD + 36 + 6,
    );
  }

  // ---------------------------------------------------------------------------
  // Speed label
  // ---------------------------------------------------------------------------

  private _buildSpeedLabel(): void {
    this._speedLabel = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 16,
        fill: 0xffd700,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    this._speedLabel.anchor.set(0.5, 0);
    this._speedLabel.position.set(Math.floor(this._screenW / 2), PAD + 60);
    this._speedLabel.visible = false;
    this.container.addChild(this._speedLabel);
  }

  /** Flash the current game speed on screen. Called by main.ts on speed change. */
  showSpeedLabel(scale: number): void {
    const pct = Math.round(scale * 100);
    this._speedLabel.text = `SPEED: ${pct}%`;
    this._speedLabel.position.x = Math.floor(this._screenW / 2);
    this._speedLabel.visible = true;
    this._speedLabel.alpha = 1;
    this._speedLabelTimer = 2; // visible for 2 seconds
  }
}

export const hud = new HUD();
