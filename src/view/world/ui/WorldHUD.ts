// World mode HUD — turn counter, resources, and End Turn button.
//
// Rendered as PixiJS containers on the UI layer (not affected by camera).

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import { currentPlayer, WorldPhase } from "@world/state/WorldState";
import { calculateCityYields } from "@world/systems/WorldEconomySystem";
import { WorldBalance } from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xaaaaaa,
});

const VALUE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fontWeight: "bold",
  fill: 0xffffff,
});

const TURN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0xffffff,
});

// ---------------------------------------------------------------------------
// WorldHUD
// ---------------------------------------------------------------------------

export class WorldHUD {
  readonly container = new Container();

  private _turnText!: Text;
  private _phaseText!: Text;
  private _goldText!: Text;
  private _foodText!: Text;
  private _endTurnBtn!: Container;
  private _endTurnBg!: Graphics;
  private _researchBtn!: Container;

  private _menuBtn!: Container;

  private _screenW = 800;
  private _screenH = 600;

  /** Callback when End Turn is clicked. */
  onEndTurn: (() => void) | null = null;
  /** Callback when Research button is clicked. */
  onResearch: (() => void) | null = null;
  /** Callback when Menu button is clicked. */
  onMenu: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._screenW = vm.screenWidth;
    this._screenH = vm.screenHeight;

    this._buildTopBar();
    this._buildResearchBtn();
    this._buildMenuBtn();
    this._buildEndTurnBtn();

    vm.addToLayer("ui", this.container);

    // Responsive repositioning
    vm.app.renderer.on("resize", (w: number, h: number) => {
      this._screenW = w;
      this._screenH = h;
      this._layout();
    });
  }

  update(state: WorldState): void {
    const player = currentPlayer(state);

    this._turnText.text = `Turn ${state.turn}`;
    this._phaseText.text = _phaseLabel(state.phase);

    // Calculate income per turn
    let goldIncome = 0;
    let foodIncome = 0;
    for (const city of state.cities.values()) {
      if (city.owner !== player.id) continue;
      const yields = calculateCityYields(city, state);
      goldIncome += yields.gold;
      foodIncome += yields.food - city.population * WorldBalance.FOOD_PER_POPULATION;
    }
    // Deduct army maintenance
    let totalUnits = 0;
    for (const army of state.armies.values()) {
      if (army.owner !== player.id) continue;
      for (const u of army.units) totalUnits += u.count;
    }
    goldIncome -= totalUnits * WorldBalance.ARMY_MAINTENANCE_PER_UNIT;

    const goldSign = goldIncome >= 0 ? "+" : "";
    const foodSign = foodIncome >= 0 ? "+" : "";
    this._goldText.text = `Gold: ${player.gold} (${goldSign}${goldIncome})`;
    this._foodText.text = `Food: ${Math.floor(player.food)} (${foodSign}${Math.floor(foodIncome)})`;

    // Only show End Turn button during player turn
    this._endTurnBtn.visible = state.phase === WorldPhase.PLAYER_TURN;
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _buildTopBar(): void {
    const bar = new Container();

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, 320, 44, 6);
    bg.fill({ color: 0x000000, alpha: 0.6 });
    bar.addChild(bg);

    // Turn
    this._turnText = new Text({ text: "Turn 1", style: TURN_STYLE });
    this._turnText.x = 10;
    this._turnText.y = 4;
    bar.addChild(this._turnText);

    // Phase
    this._phaseText = new Text({ text: "", style: LABEL_STYLE });
    this._phaseText.x = 10;
    this._phaseText.y = 24;
    bar.addChild(this._phaseText);

    // Gold
    this._goldText = new Text({ text: "Gold: 0", style: VALUE_STYLE });
    this._goldText.x = 140;
    this._goldText.y = 4;
    bar.addChild(this._goldText);

    // Food
    this._foodText = new Text({ text: "Food: 0", style: VALUE_STYLE });
    this._foodText.x = 140;
    this._foodText.y = 24;
    bar.addChild(this._foodText);

    bar.x = 10;
    bar.y = 10;
    this.container.addChild(bar);
  }

  private _buildResearchBtn(): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 100, 30, 6);
    bg.fill({ color: 0x333366 });
    bg.stroke({ color: 0x5555aa, width: 1.5 });
    btn.addChild(bg);

    const label = new Text({ text: "RESEARCH", style: BTN_STYLE });
    label.x = 10;
    label.y = 6;
    btn.addChild(label);

    btn.on("pointerdown", () => this.onResearch?.());

    this._researchBtn = btn;
    btn.x = 340;
    btn.y = 14;
    this.container.addChild(btn);
  }

  private _buildMenuBtn(): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 80, 30, 6);
    bg.fill({ color: 0x443322 });
    bg.stroke({ color: 0x887755, width: 1.5 });
    btn.addChild(bg);

    const label = new Text({ text: "MENU", style: BTN_STYLE });
    label.x = 14;
    label.y = 6;
    btn.addChild(label);

    btn.on("pointerdown", () => this.onMenu?.());

    this._menuBtn = btn;
    btn.x = 450;
    btn.y = 14;
    this.container.addChild(btn);
  }

  private _buildEndTurnBtn(): void {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    this._endTurnBg = new Graphics();
    this._endTurnBg.roundRect(0, 0, 120, 36, 6);
    this._endTurnBg.fill({ color: 0x336633 });
    this._endTurnBg.stroke({ color: 0x55aa55, width: 2 });
    btn.addChild(this._endTurnBg);

    const label = new Text({ text: "END TURN", style: BTN_STYLE });
    label.x = 16;
    label.y = 8;
    btn.addChild(label);

    btn.on("pointerdown", () => {
      this.onEndTurn?.();
    });
    btn.on("pointerover", () => {
      this._endTurnBg.clear();
      this._endTurnBg.roundRect(0, 0, 120, 36, 6);
      this._endTurnBg.fill({ color: 0x448844 });
      this._endTurnBg.stroke({ color: 0x66cc66, width: 2 });
    });
    btn.on("pointerout", () => {
      this._endTurnBg.clear();
      this._endTurnBg.roundRect(0, 0, 120, 36, 6);
      this._endTurnBg.fill({ color: 0x336633 });
      this._endTurnBg.stroke({ color: 0x55aa55, width: 2 });
    });

    this._endTurnBtn = btn;
    this.container.addChild(btn);
    this._layout();
  }

  private _layout(): void {
    // End Turn button → bottom right, above the minimap (150 + 14 padding + 10 gap)
    if (this._endTurnBtn) {
      this._endTurnBtn.x = this._screenW - 140;
      this._endTurnBtn.y = this._screenH - 150 - 14 - 36 - 10;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _phaseLabel(phase: WorldPhase): string {
  switch (phase) {
    case WorldPhase.PLAYER_TURN:
      return "Your Turn";
    case WorldPhase.AI_TURN:
      return "AI Thinking...";
    case WorldPhase.BATTLE:
      return "Battle!";
    case WorldPhase.GAME_OVER:
      return "Game Over";
  }
}

/** Singleton instance. */
export const worldHUD = new WorldHUD();
