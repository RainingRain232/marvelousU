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
import { createBattleFromEncounter, calculateInitiative, executeAction, executeEnemyTurn, advanceTurn, applyVictoryRewards, applyDefeatPenalty, isHealAbility } from "@rpg/systems/TurnBattleSystem";
import { createStarterParty } from "@rpg/systems/PartyFactory";
import { RPGViewManager } from "@view/rpg/RPGViewManager";
import { ITEM_HEALTH_POTION } from "@rpg/config/RPGItemDefs";
import { audioManager } from "@audio/AudioManager";
import { updateKillObjective, checkQuestCompletion } from "@rpg/systems/QuestSystem";
import { TurnBattleAction, TurnBattlePhase } from "@/types";
import type { BattleResults } from "@view/rpg/BattleResultsView";

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
  /** Tracks level-ups during the current battle for the results screen. */
  private _battleLevelUps: { name: string; newLevel: number }[] = [];
  private _levelUpUnsub: (() => void) | null = null;
  /** True when NPC dialog is open — blocks movement input. */
  private _npcDialogOpen = false;
  /** True when help menu is open — blocks movement input. */
  private _helpMenuOpen = false;
  private _inventoryOpen = false;

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

    // Wire battle results dismissal
    this.rpgViewManager.onBattleResultsDismissed = () => {
      // Check for game over: all party members at 1 HP and no gold (can't afford inn)
      const allCritical = this.rpgState.party.every(m => m.hp <= 1);
      if (allCritical && this.rpgState.gold === 0) {
        this.stateMachine.transition(RPGPhase.GAME_OVER);
      } else {
        this.stateMachine.returnToPrevious();
      }
    };

    // Wire NPC dialog
    this.rpgViewManager.onNPCDialogClosed = () => {
      this._npcDialogOpen = false;
    };
    this._unsubs.push(EventBus.on("rpgNPCInteraction", () => {
      this._npcDialogOpen = true;
    }));

    // Wire help menu
    this.rpgViewManager.onHelpMenuToggled = (open) => {
      this._helpMenuOpen = open;
    };

    // Wire inventory
    this.rpgViewManager.onInventoryClosed = () => {
      this._inventoryOpen = false;
    };

    // Wire game over restart
    this.rpgViewManager.onRestart = () => {
      this.destroy();
      this.boot();
    };

    // Wire dungeon exit
    this._unsubs.push(EventBus.on("rpgDungeonExited", () => {
      this.dungeonState = null;
      this.rpgViewManager.dungeonState = null;
    }));

    // Set camera zoom for overworld
    viewManager.camera.zoom = 2;

    // Start background music
    audioManager.playGameMusic();
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    if (this._levelUpUnsub) {
      this._levelUpUnsub();
      this._levelUpUnsub = null;
    }

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

      // Help menu toggle (? or F1) during exploration or battle
      if ((e.key === "?" || e.code === "F1") && (phase === RPGPhase.OVERWORLD || phase === RPGPhase.DUNGEON || phase === RPGPhase.BATTLE_TURN)) {
        this.rpgViewManager.toggleHelpMenu();
        return;
      }

      // Inventory toggle (I) during exploration
      if (e.code === "KeyI" && (phase === RPGPhase.OVERWORLD || phase === RPGPhase.DUNGEON)) {
        this.rpgViewManager.toggleInventory();
        this._inventoryOpen = !this._inventoryOpen;
        return;
      }

      if (this._npcDialogOpen || this._helpMenuOpen || this._inventoryOpen) return; // Block movement during overlays

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

  private _getBattleContext(): { biome?: string; dungeonFloor?: number; dungeonName?: string } | undefined {
    if (this.dungeonState) {
      return {
        dungeonFloor: this.dungeonState.currentFloor,
        dungeonName: this.dungeonState.name,
      };
    }
    const pos = this.rpgState.overworldPosition;
    const tile = this.overworldState.grid[pos.y]?.[pos.x];
    if (tile) {
      return { biome: tile.type };
    }
    return undefined;
  }

  private _startBattle(
    encounterId: string,
    encounterType: "random" | "dungeon" | "boss",
  ): void {
    if (this.rpgState.battleMode === "turn") {
      // Track level-ups during this battle
      this._battleLevelUps = [];
      this._levelUpUnsub = EventBus.on("rpgLevelUp", (e) => {
        const member = this.rpgState.party.find(m => m.id === e.memberId);
        this._battleLevelUps.push({ name: member?.name ?? e.memberId, newLevel: e.newLevel });
      });

      this.turnBattleState = createBattleFromEncounter(this.rpgState, encounterId, encounterType, this._getBattleContext());
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
        view.onItemSelected = (itemId: string) => {
          if (this.turnBattleState) {
            this.turnBattleState.selectedItemId = itemId;
            this._handleTurnAction(TurnBattleAction.ITEM);
          }
        };
        view.onHelpRequested = () => {
          this.rpgViewManager.toggleHelpMenu();
        };
        view.refresh();
      }

      // If first turn is enemy, execute it
      if (this.turnBattleState.phase === TurnBattlePhase.ENEMY_TURN) {
        this._processEnemyTurns();
      }
    } else {
      // Auto battle — resolve instantly
      this._runAutoBattle(encounterId, encounterType);
    }
  }

  private _runAutoBattle(
    encounterId: string,
    encounterType: "random" | "dungeon" | "boss",
  ): void {
    // Track level-ups
    this._battleLevelUps = [];
    this._levelUpUnsub = EventBus.on("rpgLevelUp", (e) => {
      const member = this.rpgState.party.find(m => m.id === e.memberId);
      this._battleLevelUps.push({ name: member?.name ?? e.memberId, newLevel: e.newLevel });
    });

    const battle = createBattleFromEncounter(this.rpgState, encounterId, encounterType, this._getBattleContext());
    calculateInitiative(battle);

    // Simulate to completion (safety cap at 200 turns)
    let turns = 0;
    while (turns < 200) {
      const p = battle.phase as string;
      if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT || p === TurnBattlePhase.FLED) break;

      const currentId = battle.turnOrder[battle.currentTurnIndex];
      const current = battle.combatants.find(c => c.id === currentId);
      if (!current || current.hp <= 0) {
        advanceTurn(battle);
        turns++;
        continue;
      }

      if (current.isPartyMember) {
        // Party AI: use ability if MP available and not a heal, else attack weakest enemy
        const aliveEnemies = battle.combatants.filter(c => !c.isPartyMember && c.hp > 0);
        if (aliveEnemies.length === 0) break;
        aliveEnemies.sort((a, b) => a.hp - b.hp);
        const target = aliveEnemies[0];

        if (current.mp >= 10 && current.abilityTypes.length > 0 && !isHealAbility(current.abilityTypes[0])) {
          executeAction(battle, TurnBattleAction.ABILITY, target.id, current.abilityTypes[0], null, this.rpgState);
        } else {
          executeAction(battle, TurnBattleAction.ATTACK, target.id, null, null, this.rpgState);
        }
      } else {
        executeEnemyTurn(battle, this.rpgState);
      }

      turns++;
    }

    // Apply results
    const victory = (battle.phase as string) === TurnBattlePhase.VICTORY;
    if (victory) {
      applyVictoryRewards(this.rpgState, battle);
      if (this._pendingEncounterId) {
        this._trackQuestKill(this._pendingEncounterId);
      }
    } else {
      applyDefeatPenalty(this.rpgState, battle);
    }

    const results: BattleResults = {
      victory,
      xpGained: victory ? battle.xpReward : 0,
      goldGained: victory ? battle.goldReward : 0,
      lootItems: victory ? battle.lootReward : [],
      levelUps: this._battleLevelUps,
    };

    if (this._levelUpUnsub) {
      this._levelUpUnsub();
      this._levelUpUnsub = null;
    }
    this._battleLevelUps = [];
    this._pendingEncounterId = null;

    this.rpgViewManager.showBattleResults(results);
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

    // For abilities, set the selected ability from the current combatant
    if (action === TurnBattleAction.ABILITY) {
      const currentId = this.turnBattleState.turnOrder[this.turnBattleState.currentTurnIndex];
      const current = this.turnBattleState.combatants.find(c => c.id === currentId);
      this.turnBattleState.selectedAbility = current?.abilityTypes[0] ?? null;
    } else {
      this.turnBattleState.selectedAbility = null;
    }

    const view = this.rpgViewManager["turnBattleView"];
    if (view) {
      const isHealAction = action === TurnBattleAction.ITEM
        || (action === TurnBattleAction.ABILITY && isHealAbility(this.turnBattleState.selectedAbility));
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
      this.turnBattleState.selectedItemId,
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

  private _returnFromBattle(victory: boolean): void {
    // Collect results before clearing state
    const results: BattleResults = {
      victory,
      xpGained: this.turnBattleState?.xpReward ?? 0,
      goldGained: this.turnBattleState?.goldReward ?? 0,
      lootItems: this.turnBattleState?.lootReward ?? [],
      levelUps: this._battleLevelUps,
    };

    // Track quest kill objectives on victory
    if (victory && this._pendingEncounterId) {
      this._trackQuestKill(this._pendingEncounterId);
    }

    // Clean up level-up listener
    if (this._levelUpUnsub) {
      this._levelUpUnsub();
      this._levelUpUnsub = null;
    }
    this._battleLevelUps = [];

    this.turnBattleState = null;
    this.rpgViewManager.turnBattleState = null;
    this._pendingEncounterId = null;

    // Show results screen — phase transition happens on dismiss
    this.rpgViewManager.showBattleResults(results);
  }

  private _trackQuestKill(encounterId: string): void {
    updateKillObjective(this.rpgState, encounterId);
    checkQuestCompletion(this.rpgState);
    // Rewards are claimed when player returns to the quest NPC
  }
}
