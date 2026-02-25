// Gold display, phase indicator, unit count — lives in the ui layer (no camera transform)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { GamePhase } from "@/types";
import type { PlayerId } from "@/types";

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
  private _westUnitVal!: Text;

  // East panel
  private _eastPanel!: Container;
  private _eastGoldVal!: Text;
  private _eastUnitVal!: Text;

  // Phase panel
  private _phasePanel!: Container;
  private _phaseText!: Text;

  // AI toggle button (below east panel)
  private _aiToggleBtn!: Container;
  private _aiToggleBg!: Graphics;
  private _aiToggleLabel!: Text;
  private _p2IsAI = true;

  // Player-switcher button (below west panel, visible only when P2 is human)
  private _switchBtn!: Container;
  private _switchBtnBg!: Graphics;
  private _switchBtnLabel!: Text;
  private _activePlayer: PlayerId = "p1";

  // START BATTLE button (below phase panel, visible only during PREP)
  private _startBattleBtn!: Container;
  private _currentPhase: GamePhase = GamePhase.PREP;

  // Speed label (shown briefly when game speed changes)
  private _speedLabel!: Text;
  private _speedLabelTimer = 0;

  private _westPlayerId: PlayerId = "";
  private _eastPlayerId: PlayerId = "";
  private _screenW = 800;

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

    this._buildWestPanel();
    this._buildEastPanel();
    this._buildPhasePanel();
    this._buildAIToggleBtn();
    this._buildSwitchBtn();
    this._buildStartBattleBtn();
    this._buildSpeedLabel();

    vm.addToLayer("ui", this.container);

    // Listen to sim events for immediate updates
    this._unsubscribers.push(
      EventBus.on("goldChanged", ({ playerId, amount }) => {
        this._setGold(playerId, amount);
      }),
      EventBus.on("phaseChanged", ({ phase }) => {
        this._setPhase(phase);
      }),
    );

    // Sync to current state immediately
    this._syncFromState(state);

    // Reposition on resize
    const onResize = () => {
      this._screenW = vm.screenWidth;
      this._repositionEastPanel();
      this._repositionPhasePanel();
      this._repositionAIToggle();
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
    this._westPanel = makePanel(PANEL_W, PANEL_H);
    this._westPanel.position.set(PAD, PAD);

    const goldLabel = new Text({ text: "GOLD", style: STYLE_LABEL });
    goldLabel.position.set(10, 8);

    this._westGoldVal = new Text({ text: "0", style: STYLE_VALUE });
    this._westGoldVal.position.set(10, 24);

    const unitLabel = new Text({ text: "UNITS", style: STYLE_LABEL });
    unitLabel.position.set(110, 8);

    this._westUnitVal = new Text({ text: "0", style: STYLE_VALUE });
    this._westUnitVal.position.set(110, 24);

    this._westPanel.addChild(goldLabel);
    this._westPanel.addChild(this._westGoldVal);
    this._westPanel.addChild(unitLabel);
    this._westPanel.addChild(this._westUnitVal);
    this.container.addChild(this._westPanel);
  }

  private _buildEastPanel(): void {
    this._eastPanel = makePanel(PANEL_W, PANEL_H);
    // x positioned in _repositionEastPanel
    this._eastPanel.position.y = PAD;

    const goldLabel = new Text({ text: "GOLD", style: STYLE_LABEL });
    goldLabel.position.set(10, 8);

    this._eastGoldVal = new Text({ text: "0", style: STYLE_VALUE });
    this._eastGoldVal.position.set(10, 24);

    const unitLabel = new Text({ text: "UNITS", style: STYLE_LABEL });
    unitLabel.position.set(110, 8);

    this._eastUnitVal = new Text({ text: "0", style: STYLE_VALUE });
    this._eastUnitVal.position.set(110, 24);

    this._eastPanel.addChild(goldLabel);
    this._eastPanel.addChild(this._eastGoldVal);
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
    this._eastPanel.position.x = this._screenW - PANEL_W - PAD;
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
    if (west) this._westGoldVal.text = String(west.gold);
    if (east) this._eastGoldVal.text = String(east.gold);
    this._setPhase(state.phase);
    this.update(state);
  }

  /** Sync the AI toggle button to a known state (e.g. set from the menu). */
  setP2AI(isAI: boolean): void {
    this._p2IsAI = isAI;
    this._refreshAIToggle();
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
  // AI toggle button — sits below the east (p2) panel
  // ---------------------------------------------------------------------------

  private _buildAIToggleBtn(): void {
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

    this._aiToggleBg = bg;
    this._aiToggleLabel = label;
    this._aiToggleBtn = btn;
    this.container.addChild(btn);

    this._refreshAIToggle();

    btn.on("pointerdown", () => {
      this._p2IsAI = !this._p2IsAI;
      this._refreshAIToggle();
      this.onAIToggle?.(this._p2IsAI);
    });

    // Position is set in _repositionEastPanel (called on init + resize)
    this._repositionAIToggle();
  }

  private _refreshAIToggle(): void {
    const W = PANEL_W;
    const H = 28;
    const active = this._p2IsAI;
    this._aiToggleBg.clear();
    this._aiToggleBg
      .roundRect(0, 0, W, H, 4)
      .fill({ color: active ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, W, H, 4)
      .stroke({ color: active ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._aiToggleLabel.text = active
      ? "P2: AI  [click to disable]"
      : "P2: HUMAN  [click to enable AI]";
    this._aiToggleLabel.style.fill = active ? 0x88ffaa : 0xff8888;
  }

  private _repositionAIToggle(): void {
    if (!this._aiToggleBtn) return;
    this._aiToggleBtn.position.set(
      this._screenW - PANEL_W - PAD,
      PAD + PANEL_H + 6,
    );
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
    const visible = !this._p2IsAI;
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
