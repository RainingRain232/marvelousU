// Gold display, phase indicator, unit count — lives in the ui layer (no camera transform)
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import type { GamePhase, PlayerId } from "@/types";

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
  result: "RESULT",
};

// ---------------------------------------------------------------------------
// Small helper: builds a rounded-rect panel with border
// ---------------------------------------------------------------------------

function makePanel(w: number, h: number): Graphics {
  return new Graphics()
    .roundRect(0, 0, w, h, CORNER_R)
    .fill({ color: BG_COLOR, alpha: BG_ALPHA })
    .roundRect(0, 0, w, h, CORNER_R)
    .stroke({ color: BORDER_COLOR, alpha: 0.5, width: BORDER_W });
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
  private _westPanel!: Graphics;
  private _westGoldVal!: Text;
  private _westUnitVal!: Text;

  // East panel
  private _eastPanel!: Graphics;
  private _eastGoldVal!: Text;
  private _eastUnitVal!: Text;

  // Phase panel
  private _phasePanel!: Graphics;
  private _phaseText!: Text;

  private _westPlayerId: PlayerId = "";
  private _eastPlayerId: PlayerId = "";
  private _screenW = 800;

  private _unsubscribers: Array<() => void> = [];

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

  private _setGold(playerId: PlayerId, amount: number): void {
    if (playerId === this._westPlayerId) {
      this._westGoldVal.text = String(amount);
    } else if (playerId === this._eastPlayerId) {
      this._eastGoldVal.text = String(amount);
    }
  }

  private _setPhase(phase: GamePhase): void {
    this._phaseText.text = PHASE_LABELS[phase] ?? phase.toUpperCase();
  }

  private _countUnits(state: GameState, playerId: PlayerId): number {
    let count = 0;
    for (const unit of state.units.values()) {
      if (unit.owner === playerId) count++;
    }
    return count;
  }
}

export const hud = new HUD();
