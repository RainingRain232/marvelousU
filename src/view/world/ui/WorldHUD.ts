// World mode HUD — turn counter, resources, and End Turn button.
//
// Rendered as PixiJS containers on the UI layer (not affected by camera).

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { t } from "@/i18n/i18n";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import { currentPlayer, WorldPhase } from "@world/state/WorldState";
import { calculateCityYields } from "@world/systems/WorldEconomySystem";
import { WorldBalance } from "@world/config/WorldConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { getResearchDef } from "@world/config/ResearchDefs";
import { magicTierCost } from "@world/config/MagicResearchDefs";

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
  private _manaText!: Text;
  private _scienceText!: Text;
  private _crystalText!: Text;
  private _crystalContainer!: Container;
  private _researchText!: Text;
  private _researchBarBg!: Graphics;
  private _researchBarFill!: Graphics;
  private _endTurnBtn!: Container;
  private _endTurnBg!: Graphics;
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
    this._buildResearchInfoBar();
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
    let manaIncome = 0;
    let scienceIncome = 0;
    for (const city of state.cities.values()) {
      if (city.owner !== player.id) continue;
      const yields = calculateCityYields(city, state);
      goldIncome += yields.gold;
      foodIncome += yields.food - city.population * WorldBalance.FOOD_PER_POPULATION;
      manaIncome += yields.mana;
      scienceIncome += yields.science;
    }
    // Deduct army maintenance (tier-based)
    let maintenance = 0;
    for (const army of state.armies.values()) {
      if (army.owner !== player.id) continue;
      for (const u of army.units) {
        const unitDef = UNIT_DEFINITIONS[u.unitType as keyof typeof UNIT_DEFINITIONS];
        const costTier = unitDef ? Math.ceil(unitDef.cost / 50) : 1;
        maintenance += u.count * Math.max(1, costTier);
      }
    }
    goldIncome -= maintenance;

    const goldSign = goldIncome >= 0 ? "+" : "";
    const foodSign = foodIncome >= 0 ? "+" : "";
    const manaSign = manaIncome >= 0 ? "+" : "";
    this._goldText.text = `${player.gold} (${goldSign}${goldIncome})`;
    this._foodText.text = `${Math.floor(player.food)} (${foodSign}${Math.floor(foodIncome)})`;
    this._manaText.text = `${player.mana} (${manaSign}${manaIncome})`;
    this._scienceText.text = `+${scienceIncome + player.morgaineCrystals * 10}`;

    // Morgaine crystals
    this._crystalText.text = `${player.morgaineCrystals}/3`;

    // Research progress
    let researchStr = "";
    if (player.activeResearch) {
      const def = getResearchDef(player.activeResearch);
      const total = def?.turnsToComplete ?? 1;
      const pct = Math.min(1, player.researchProgress / total);
      researchStr = `Research: ${player.activeResearch} (${player.researchTurnsLeft}t)`;
      this._researchBarFill.clear();
      this._researchBarFill.rect(0, 0, 200 * pct, 4);
      this._researchBarFill.fill({ color: 0x44aa44 });
    }
    if (player.activeMagicResearch) {
      const { school, tier } = player.activeMagicResearch;
      const cost = magicTierCost(tier);
      const pct = Math.min(1, player.magicResearchProgress / cost);
      const magicTurns = pct < 1 ? Math.ceil((cost - player.magicResearchProgress) / Math.max(0.01, player.magicResearchRatio)) : 0;
      const magicStr = `Magic: ${school} T${tier} (${magicTurns}t)`;
      researchStr = researchStr ? `${researchStr}  |  ${magicStr}` : magicStr;
      if (!player.activeResearch) {
        this._researchBarFill.clear();
        this._researchBarFill.rect(0, 0, 200 * pct, 4);
        this._researchBarFill.fill({ color: 0x8888ff });
      }
    }
    if (!researchStr) {
      researchStr = "No research active";
      this._researchBarFill.clear();
    }
    this._researchText.text = researchStr;

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

    // Background — wide horizontal bar
    const bg = new Graphics();
    bg.roundRect(0, 0, 700, 44, 6);
    bg.fill({ color: 0x000000, alpha: 0.6 });
    bar.addChild(bg);

    let x = 10;

    // Turn
    this._turnText = new Text({ text: "Turn 1", style: TURN_STYLE });
    this._turnText.x = x;
    this._turnText.y = 4;
    bar.addChild(this._turnText);

    // Phase
    this._phaseText = new Text({ text: "", style: LABEL_STYLE });
    this._phaseText.x = x;
    this._phaseText.y = 24;
    bar.addChild(this._phaseText);

    x = 120;

    // Gold icon + text
    const goldIcon = new Graphics();
    goldIcon.circle(0, 0, 6);
    goldIcon.fill({ color: 0xffcc44 });
    goldIcon.stroke({ color: 0xaa8800, width: 1 });
    goldIcon.moveTo(-2, -3).lineTo(-2, 3);
    goldIcon.stroke({ color: 0xaa8800, width: 1.5 });
    goldIcon.position.set(x, 16);
    bar.addChild(goldIcon);
    this._goldText = new Text({ text: "0", style: VALUE_STYLE });
    this._goldText.x = x + 12;
    this._goldText.y = 8;
    bar.addChild(this._goldText);

    x = 260;

    // Food icon + text
    const foodIcon = new Graphics();
    foodIcon.moveTo(0, -6).lineTo(-3, 0).lineTo(0, -2).lineTo(3, 0).closePath();
    foodIcon.fill({ color: 0x88cc44 });
    foodIcon.moveTo(0, -2).lineTo(0, 6);
    foodIcon.stroke({ color: 0x88aa33, width: 1.5 });
    foodIcon.position.set(x, 16);
    bar.addChild(foodIcon);
    this._foodText = new Text({ text: "0", style: VALUE_STYLE });
    this._foodText.x = x + 12;
    this._foodText.y = 8;
    bar.addChild(this._foodText);

    x = 400;

    // Mana icon + text
    const manaIcon = new Graphics();
    manaIcon.moveTo(0, -6).lineTo(5, 2).lineTo(0, 6).lineTo(-5, 2).closePath();
    manaIcon.fill({ color: 0x6666ff, alpha: 0.8 });
    manaIcon.stroke({ color: 0x9999ff, width: 1 });
    manaIcon.position.set(x, 16);
    bar.addChild(manaIcon);
    this._manaText = new Text({ text: "0", style: new TextStyle({
      fontFamily: "monospace", fontSize: 15, fontWeight: "bold", fill: 0x8888ff,
    }) });
    this._manaText.x = x + 12;
    this._manaText.y = 8;
    bar.addChild(this._manaText);

    x = 500;

    // Research icon + text
    const sciIcon = new Graphics();
    sciIcon.roundRect(-3, -5, 6, 8, 2);
    sciIcon.fill({ color: 0x33aa55 });
    sciIcon.stroke({ color: 0x55cc77, width: 0.8 });
    sciIcon.rect(-5, 3, 10, 2);
    sciIcon.fill({ color: 0x33aa55 });
    sciIcon.position.set(x, 16);
    bar.addChild(sciIcon);
    this._scienceText = new Text({ text: "+0", style: new TextStyle({
      fontFamily: "monospace", fontSize: 15, fontWeight: "bold", fill: 0x44aa44,
    }) });
    this._scienceText.x = x + 12;
    this._scienceText.y = 8;
    bar.addChild(this._scienceText);

    x = 590;

    // Morgaine crystal icon + text
    this._crystalContainer = new Container();
    const crystalIcon = new Graphics();
    crystalIcon.moveTo(0, -6).lineTo(4, 0).lineTo(0, 6).lineTo(-4, 0).closePath();
    crystalIcon.fill({ color: 0xcc44ff, alpha: 0.9 });
    crystalIcon.stroke({ color: 0xee88ff, width: 1 });
    crystalIcon.position.set(x, 16);
    this._crystalContainer.addChild(crystalIcon);
    this._crystalText = new Text({ text: "0/3", style: new TextStyle({
      fontFamily: "monospace", fontSize: 15, fontWeight: "bold", fill: 0xcc88ff,
    }) });
    this._crystalText.x = x + 12;
    this._crystalText.y = 8;
    this._crystalContainer.addChild(this._crystalText);
    bar.addChild(this._crystalContainer);

    bar.x = 10;
    bar.y = 10;
    this.container.addChild(bar);
  }

  private _buildResearchInfoBar(): void {
    const bar = new Container();

    const bg = new Graphics();
    bg.roundRect(0, 0, 500, 20, 4);
    bg.fill({ color: 0x000000, alpha: 0.5 });
    bar.addChild(bg);

    this._researchText = new Text({
      text: "No research active",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x88aa88 }),
    });
    this._researchText.x = 8;
    this._researchText.y = 2;
    bar.addChild(this._researchText);

    // Progress bar
    this._researchBarBg = new Graphics();
    this._researchBarBg.rect(0, 0, 200, 4);
    this._researchBarBg.fill({ color: 0x333333 });
    this._researchBarBg.position.set(8, 16);
    bar.addChild(this._researchBarBg);

    this._researchBarFill = new Graphics();
    this._researchBarFill.position.set(8, 16);
    bar.addChild(this._researchBarFill);

    bar.x = 10;
    bar.y = 58;
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

    const label = new Text({ text: t("world.research"), style: BTN_STYLE });
    label.x = 10;
    label.y = 6;
    btn.addChild(label);

    btn.on("pointerdown", () => this.onResearch?.());

    btn.x = 720;
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

    const label = new Text({ text: t("menu"), style: BTN_STYLE });
    label.x = 14;
    label.y = 6;
    btn.addChild(label);

    btn.on("pointerdown", () => this.onMenu?.());

    btn.x = 830;
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

    const label = new Text({ text: t("world.end_turn"), style: BTN_STYLE });
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
