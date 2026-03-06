// Coordinates which RPG view is active based on RPGPhase
import { RPGPhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { viewManager } from "@view/ViewManager";
import type { RPGState } from "@rpg/state/RPGState";
import type { OverworldState } from "@rpg/state/OverworldState";
import type { TownData } from "@rpg/state/OverworldState";
import type { DungeonState } from "@rpg/state/DungeonState";
import type { TurnBattleState } from "@rpg/state/TurnBattleState";
import { OverworldView } from "./OverworldView";
import { DungeonView } from "./DungeonView";
import { TurnBattleView } from "./TurnBattleView";
import { TownMenuView } from "./TownMenuView";

// ---------------------------------------------------------------------------
// RPGViewManager
// ---------------------------------------------------------------------------

export class RPGViewManager {
  private overworldView: OverworldView | null = null;
  private dungeonView: DungeonView | null = null;
  private turnBattleView: TurnBattleView | null = null;
  private townMenuView: TownMenuView | null = null;
  private _unsubPhase: (() => void) | null = null;

  rpgState!: RPGState;
  overworldState!: OverworldState;
  dungeonState: DungeonState | null = null;
  turnBattleState: TurnBattleState | null = null;

  /** Set by RPGBoot when entering a town. */
  currentTownData: TownData | null = null;
  currentTownName: string = "";

  /** Called by RPGBoot to leave town. */
  onLeaveTown: (() => void) | null = null;

  init(
    rpgState: RPGState,
    overworldState: OverworldState,
  ): void {
    this.rpgState = rpgState;
    this.overworldState = overworldState;

    // Listen for phase changes
    this._unsubPhase = EventBus.on("rpgPhaseChanged", (e) => {
      this._onPhaseChanged(e.phase, e.previousPhase);
    });

    // Start in overworld
    this._showOverworld();
  }

  destroy(): void {
    this._hideAll();
    this._unsubPhase?.();
    this._unsubPhase = null;
  }

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------

  private _onPhaseChanged(phase: RPGPhase, _prev: RPGPhase): void {
    this._hideAll();

    switch (phase) {
      case RPGPhase.OVERWORLD:
        this._showOverworld();
        break;
      case RPGPhase.DUNGEON:
        this._showDungeon();
        break;
      case RPGPhase.BATTLE_TURN:
        this._showTurnBattle();
        break;
      case RPGPhase.BATTLE_AUTO:
        // Auto battle view will be handled in Phase 5
        break;
      case RPGPhase.TOWN_MENU:
        this._showTownMenu();
        break;
      case RPGPhase.GAME_OVER:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Show/hide views
  // ---------------------------------------------------------------------------

  private _hideAll(): void {
    if (this.overworldView) {
      this.overworldView.destroy();
      this.overworldView = null;
    }
    if (this.dungeonView) {
      this.dungeonView.destroy();
      this.dungeonView = null;
    }
    if (this.turnBattleView) {
      this.turnBattleView.destroy();
      this.turnBattleView = null;
    }
    if (this.townMenuView) {
      this.townMenuView.destroy();
      this.townMenuView = null;
    }
  }

  private _showOverworld(): void {
    this.overworldView = new OverworldView();
    this.overworldView.init(viewManager, this.overworldState, this.rpgState);
  }

  private _showDungeon(): void {
    if (!this.dungeonState) return;
    this.dungeonView = new DungeonView();
    this.dungeonView.init(viewManager, this.dungeonState, this.rpgState);
  }

  private _showTurnBattle(): void {
    if (!this.turnBattleState) return;
    this.turnBattleView = new TurnBattleView();
    this.turnBattleView.init(viewManager, this.turnBattleState, this.rpgState);
  }

  private _showTownMenu(): void {
    if (!this.currentTownData) return;
    this.townMenuView = new TownMenuView();
    this.townMenuView.init(viewManager, this.rpgState, this.currentTownData, this.currentTownName);
    this.townMenuView.onLeave = () => {
      this.onLeaveTown?.();
    };
  }
}
