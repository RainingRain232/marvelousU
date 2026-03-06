// RPG mode orchestrator — boots the overworld, handles phase transitions,
// and wires input, battle, and dungeon systems together.
import { RPGPhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { viewManager } from "@view/ViewManager";
import { createRPGState } from "@rpg/state/RPGState";
import type { RPGState } from "@rpg/state/RPGState";
import type { OverworldState, TownData } from "@rpg/state/OverworldState";
import type { DungeonState } from "@rpg/state/DungeonState";
import type { TurnBattleState } from "@rpg/state/TurnBattleState";
import { generateOverworld } from "@rpg/gen/OverworldGenerator";
import { generateDungeon } from "@rpg/gen/DungeonGenerator";
import { DUNGEON_DEFS } from "@rpg/config/DungeonDefs";
import { RPGStateMachine } from "@rpg/systems/RPGStateMachine";
import { moveParty } from "@rpg/systems/OverworldSystem";
import { moveDungeonParty } from "@rpg/systems/DungeonSystem";
import { createBattleFromEncounter, calculateInitiative, executeAction, executeEnemyTurn, applyVictoryRewards, applyDefeatPenalty } from "@rpg/systems/TurnBattleSystem";
import { createStarterParty } from "@rpg/systems/PartyFactory";
import { RPGViewManager } from "@view/rpg/RPGViewManager";
import { ITEM_HEALTH_POTION } from "@rpg/config/RPGItemDefs";
import { TurnBattleAction, TurnBattlePhase } from "@/types";

// ---------------------------------------------------------------------------
// RPGGame
// ---------------------------------------------------------------------------

export class RPGGame {
  rpgState!: RPGState;
  overworldState!: OverworldState;
  dungeonState: DungeonState | null = null;
  turnBattleState: TurnBattleState | null = null;

  private stateMachine!: RPGStateMachine;
  private rpgViewManager!: RPGViewManager;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _unsubs: Array<() => void> = [];
  /** Tracks the current encounter for auto-battle fallback. */
  _pendingEncounterId: string | null = null;

  async boot(): Promise<void> {
    const seed = Date.now();

    // Generate overworld
    const { state: overworldState, startPosition } = generateOverworld(seed);
    this.overworldState = overworldState;

    // Create RPG state
    this.rpgState = createRPGState(seed, startPosition);
    this.rpgState.party = createStarterParty();

    // Give starting items
    this.rpgState.inventory.items.push({ item: ITEM_HEALTH_POTION, quantity: 5 });

    // State machine
    this.stateMachine = new RPGStateMachine();

    // View manager
    this.rpgViewManager = new RPGViewManager();
    this.rpgViewManager.init(this.rpgState, this.overworldState);

    // Wire input
    this._setupInput();

    // Wire encounter events
    this._unsubs.push(EventBus.on("rpgEncounterTriggered", (e) => {
      this._pendingEncounterId = e.encounterId;
      this._startBattle(e.encounterId, e.encounterType);
    }));

    // Wire dungeon entry
    this._unsubs.push(EventBus.on("rpgDungeonEntered", (e) => {
      this._enterDungeon(e.dungeonId);
    }));

    // Wire battle end
    this._unsubs.push(EventBus.on("rpgBattleEnded", (e) => {
      this._onBattleEnd(e.victory);
    }));

    // Wire town entry
    this._unsubs.push(EventBus.on("rpgTownEntered", (e) => {
      this._onTownEntered(e.townId);
    }));

    // Wire town leave
    this.rpgViewManager.onLeaveTown = () => {
      this.rpgViewManager.currentTownData = null;
      this.rpgViewManager.currentTownName = "";
      this.stateMachine.transition(RPGPhase.OVERWORLD);
    };

    // Wire dungeon exit
    this._unsubs.push(EventBus.on("rpgDungeonExited", () => {
      this.dungeonState = null;
      this.rpgViewManager.dungeonState = null;
    }));

    // Set camera zoom for overworld
    viewManager.camera.zoom = 2;
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }

    this.rpgViewManager.destroy();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const phase = this.stateMachine.currentPhase;

      if (phase === RPGPhase.OVERWORLD) {
        this._handleOverworldInput(e);
      } else if (phase === RPGPhase.DUNGEON) {
        this._handleDungeonInput(e);
      } else if (phase === RPGPhase.BATTLE_TURN) {
        // Battle input is handled by TurnBattleView
      } else if (phase === RPGPhase.TOWN_MENU) {
        // Town menu input is handled by TownMenuView
      }

      // Toggle battle mode
      if (e.code === "KeyT" && (phase === RPGPhase.OVERWORLD || phase === RPGPhase.DUNGEON)) {
        this.rpgState.battleMode = this.rpgState.battleMode === "turn" ? "auto" : "turn";
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
  }

  private _handleOverworldInput(e: KeyboardEvent): void {
    let dx = 0;
    let dy = 0;

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        dy = -1;
        break;
      case "ArrowDown":
      case "KeyS":
        dy = 1;
        break;
      case "ArrowLeft":
      case "KeyA":
        dx = -1;
        break;
      case "ArrowRight":
      case "KeyD":
        dx = 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    moveParty(this.rpgState, this.overworldState, dx, dy, this.stateMachine);
  }

  private _handleDungeonInput(e: KeyboardEvent): void {
    if (!this.dungeonState) return;

    let dx = 0;
    let dy = 0;

    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        dy = -1;
        break;
      case "ArrowDown":
      case "KeyS":
        dy = 1;
        break;
      case "ArrowLeft":
      case "KeyA":
        dx = -1;
        break;
      case "ArrowRight":
      case "KeyD":
        dx = 1;
        break;
      case "Escape":
        // Can't escape dungeon from keyboard — must find stairs
        return;
      default:
        return;
    }

    e.preventDefault();
    moveDungeonParty(this.rpgState, this.dungeonState, dx, dy, this.stateMachine);
  }

  // ---------------------------------------------------------------------------
  // Town
  // ---------------------------------------------------------------------------

  private _onTownEntered(townId: string): void {
    const entity = this.overworldState.entities.get(townId);
    if (!entity || entity.type !== "town") return;

    const townData = entity.data as TownData;
    this.rpgViewManager.currentTownData = townData;
    this.rpgViewManager.currentTownName = entity.name;
  }

  // ---------------------------------------------------------------------------
  // Dungeon
  // ---------------------------------------------------------------------------

  private _enterDungeon(dungeonId: string): void {
    const def = DUNGEON_DEFS[dungeonId];
    if (!def) return;

    this.dungeonState = generateDungeon(def, this.rpgState.seed + this.rpgState.gameTime);
    this.rpgViewManager.dungeonState = this.dungeonState;
  }

  // ---------------------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------------------

  private _startBattle(
    encounterId: string,
    encounterType: "random" | "dungeon" | "boss",
  ): void {
    if (this.rpgState.battleMode === "turn") {
      this.turnBattleState = createBattleFromEncounter(this.rpgState, encounterId, encounterType);
      this.rpgViewManager.turnBattleState = this.turnBattleState;

      // Calculate initiative and start
      calculateInitiative(this.turnBattleState);

      // Wire up view callbacks
      const view = this.rpgViewManager["turnBattleView"];
      if (view) {
        view.onActionSelected = (action: TurnBattleAction) => {
          this._handleTurnAction(action);
        };
        view.onTargetSelected = (targetId: string) => {
          this._handleTargetSelected(targetId);
        };
        view.refresh();
      }

      // If first turn is enemy, execute it
      if (this.turnBattleState.phase === TurnBattlePhase.ENEMY_TURN) {
        this._processEnemyTurns();
      }
    }
    // Auto battle mode will be handled separately
  }

  private _handleTurnAction(action: TurnBattleAction): void {
    if (!this.turnBattleState) return;

    if (action === TurnBattleAction.DEFEND) {
      executeAction(this.turnBattleState, action, null, null, null, this.rpgState);
      this._afterTurnAction();
      return;
    }

    if (action === TurnBattleAction.FLEE) {
      executeAction(this.turnBattleState, action, null, null, null, this.rpgState);
      this._afterTurnAction();
      return;
    }

    // Need target selection
    this.turnBattleState.selectedAction = action;
    this.turnBattleState.phase = TurnBattlePhase.SELECT_TARGET;

    const view = this.rpgViewManager["turnBattleView"];
    if (view) {
      const isHealAction = action === TurnBattleAction.ITEM;
      const targets = this.turnBattleState.combatants.filter(c => {
        if (c.hp <= 0) return false;
        return isHealAction ? c.isPartyMember : !c.isPartyMember;
      });
      view.setSelectableTargets(targets);
    }
  }

  private _handleTargetSelected(targetId: string): void {
    if (!this.turnBattleState) return;

    const action = this.turnBattleState.selectedAction;
    if (!action) return;

    executeAction(
      this.turnBattleState,
      action,
      targetId,
      this.turnBattleState.selectedAbility,
      null,
      this.rpgState,
    );

    this._afterTurnAction();
  }

  private _afterTurnAction(): void {
    if (!this.turnBattleState) return;

    const view = this.rpgViewManager["turnBattleView"];

    // Check for battle end states
    if (this.turnBattleState.phase === TurnBattlePhase.VICTORY) {
      applyVictoryRewards(this.rpgState, this.turnBattleState);
      view?.refresh();
      // Return to previous phase after short delay
      setTimeout(() => this._returnFromBattle(true), 1500);
      return;
    }

    if (this.turnBattleState.phase === TurnBattlePhase.DEFEAT) {
      applyDefeatPenalty(this.rpgState, this.turnBattleState);
      view?.refresh();
      setTimeout(() => this._returnFromBattle(false), 1500);
      return;
    }

    if (this.turnBattleState.phase === TurnBattlePhase.FLED) {
      view?.refresh();
      setTimeout(() => this._returnFromBattle(false), 800);
      return;
    }

    // Process enemy turns
    if (this.turnBattleState.phase === TurnBattlePhase.ENEMY_TURN) {
      this._processEnemyTurns();
    }

    view?.refresh();
  }

  private _processEnemyTurns(): void {
    if (!this.turnBattleState) return;

    // Execute all consecutive enemy turns
    // Use string comparison to avoid TS narrowing issues
    while ((this.turnBattleState.phase as string) === TurnBattlePhase.ENEMY_TURN) {
      executeEnemyTurn(this.turnBattleState, this.rpgState);

      // Check end conditions after each enemy action
      const p = this.turnBattleState.phase as string;
      if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT) {
        this._afterTurnAction();
        return;
      }
    }

    const view = this.rpgViewManager["turnBattleView"];
    view?.refresh();
  }

  // ---------------------------------------------------------------------------
  // Return from battle
  // ---------------------------------------------------------------------------

  private _onBattleEnd(_victory: boolean): void {
    // Handled by _returnFromBattle
  }

  private _returnFromBattle(_victory: boolean): void {
    this.turnBattleState = null;
    this.rpgViewManager.turnBattleState = null;
    this._pendingEncounterId = null;

    // Return to the previous exploration phase
    this.stateMachine.returnToPrevious();
  }
}
