// RPG mode orchestrator — boots the overworld, handles phase transitions,
// and wires input, battle, and dungeon systems together.
import { RPGPhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { viewManager } from "@view/ViewManager";
import { createRPGState } from "@rpg/state/RPGState";
import type { RPGState } from "@rpg/state/RPGState";
import type { OverworldState, TownData, ArcaneLibraryData } from "@rpg/state/OverworldState";
import type { DungeonState } from "@rpg/state/DungeonState";
import type { TurnBattleState } from "@rpg/state/TurnBattleState";
import { generateOverworld } from "@rpg/gen/OverworldGenerator";
import { generateDungeon } from "@rpg/gen/DungeonGenerator";
import { DUNGEON_DEFS } from "@rpg/config/DungeonDefs";
import { RPGStateMachine } from "@rpg/systems/RPGStateMachine";
import { moveParty } from "@rpg/systems/OverworldSystem";
import { moveDungeonParty } from "@rpg/systems/DungeonSystem";
import { createBattleFromEncounter, calculateInitiative, executeAction, executeEnemyTurn, advanceTurn, applyVictoryRewards, applyDefeatPenalty, isHealAbility, isHealSpell, isSummonSpell, getValidTargets } from "@rpg/systems/TurnBattleSystem";
import { applyArenaResult } from "@rpg/systems/ArenaSystem";
import { learnSpells } from "@rpg/systems/SpellLearningSystem";
import type { UpgradeType } from "@/types";
import { createStarterParty } from "@rpg/systems/PartyFactory";
import { RPGViewManager } from "@view/rpg/RPGViewManager";
import { ITEM_HEALTH_POTION } from "@rpg/config/RPGItemDefs";
import { audioManager } from "@audio/AudioManager";
import { updateKillObjective, checkQuestCompletion } from "@rpg/systems/QuestSystem";
import { checkPostBattleLeaderSpawn, checkDungeonExitLeaderSpawn, getBlessingXpMultiplier, getBlessingGoldMultiplier } from "@rpg/systems/LeaderEncounterSystem";
import { TurnBattleAction, TurnBattlePhase } from "@/types";
import type { BattleResults } from "@view/rpg/BattleResultsView";
import { saveGame, loadGame, restoreRPGState } from "@rpg/systems/SaveSystem";
import { loadOptions } from "@view/rpg/OptionsView";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import type { GameOptions } from "@view/rpg/OptionsView";

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
  /** If the current battle is an arena fight, stores the bet amount; null otherwise. */
  private _pendingArenaBet: number | null = null;
  /** For arena fights: "auto" = watch/auto-resolve, "turn" = player controls. */
  private _pendingArenaMode: "auto" | "turn" | null = null;
  /** Tracks level-ups during the current battle for the results screen. */
  private _battleLevelUps: { name: string; newLevel: number; note?: string }[] = [];
  private _levelUpUnsub: (() => void) | null = null;
  /** True when NPC dialog is open — blocks movement input. */
  private _npcDialogOpen = false;
  /** True when help menu is open — blocks movement input. */
  private _helpMenuOpen = false;
  private _inventoryOpen = false;
  /** Current game options. */
  private _gameOptions: GameOptions = loadOptions();
  /** True when pause/save menu is open during gameplay. */
  private _pauseMenuOpen = false;

  async boot(): Promise<void> {
    // State machine starts at MAIN_MENU
    this.stateMachine = new RPGStateMachine(RPGPhase.MAIN_MENU);

    // View manager — show main menu
    this.rpgViewManager = new RPGViewManager();
    this.rpgViewManager.showMainMenu(
      () => this._startNewGame(),
      (slot) => this._loadSavedGame(slot),
      () => this._showOptions(true),
    );

    // Wire input
    this._setupInput();
  }

  /** Start a fresh new game. */
  private _startNewGame(): void {
    this.rpgViewManager.showLoading("Generating world...");
    // Defer heavy work so the loading text renders first
    setTimeout(() => {
      const seed = Date.now();
      const { state: overworldState, startPosition } = generateOverworld(seed);
      this.overworldState = overworldState;

      this.rpgState = createRPGState(seed, startPosition);
      this.rpgState.party = createStarterParty();
      this.rpgState.inventory.items.push({ item: ITEM_HEALTH_POTION, quantity: 5 });

      // Apply options
      this.rpgState.battleMode = this._gameOptions.battleMode;
      this.rpgState.randomEncounterRate = this._gameOptions.randomEncounterRate;
      this.rpgState.roamingEncounterRate = this._gameOptions.roamingEncounterRate;

      this.rpgViewManager.hideLoading();
      this._enterGameplay();
    }, 50);
  }

  /** Load a saved game from slot. */
  private _loadSavedGame(slot: number): void {
    const data = loadGame(slot);
    if (!data) return;

    this.rpgViewManager.showLoading("Loading save...");
    setTimeout(() => {
      // Re-generate overworld from same seed
      const { state: overworldState } = generateOverworld(data.seed);
      this.overworldState = overworldState;

      // Restore state
      this.rpgState = restoreRPGState(data.rpgState);

      // Sync overworld party position with saved position and reveal tiles around it
      this.overworldState.partyPosition = { ...this.rpgState.overworldPosition };
      const vr = RPGBalance.VISION_RADIUS;
      const pos = this.overworldState.partyPosition;
      for (let dy = -vr; dy <= vr; dy++) {
        for (let dx = -vr; dx <= vr; dx++) {
          if (dx * dx + dy * dy > vr * vr) continue;
          const tx = pos.x + dx;
          const ty = pos.y + dy;
          if (tx >= 0 && tx < this.overworldState.width && ty >= 0 && ty < this.overworldState.height) {
            this.overworldState.grid[ty][tx].discovered = true;
          }
        }
      }

      this.rpgViewManager.hideLoading();
      this._enterGameplay();
    }, 50);
  }

  /** Common setup after new/load game. */
  private _enterGameplay(): void {
    this.rpgViewManager.hideMainMenu();
    this.rpgViewManager.hideOptions();
    this.rpgViewManager.init(this.rpgState, this.overworldState);

    // Transition to overworld
    this.stateMachine.transition(RPGPhase.OVERWORLD);

    // Wire gameplay events
    this._wireGameplayEvents();

    // Set camera zoom
    viewManager.camera.zoom = 2;

    // Start music
    audioManager.playGameMusic();
  }

  /** Wire all gameplay event handlers. */
  private _wireGameplayEvents(): void {
    // Clear existing subs
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    this._unsubs.push(EventBus.on("rpgEncounterTriggered", (e) => {
      this._pendingEncounterId = e.encounterId;
      this._pendingArenaBet = e.arenaBet ?? null;
      this._pendingArenaMode = e.arenaMode ?? null;
      this._startBattle(e.encounterId, e.encounterType);
    }));

    this._unsubs.push(EventBus.on("rpgDungeonEntered", (e) => {
      this._enterDungeon(e.dungeonId);
    }));

    this._unsubs.push(EventBus.on("rpgTownEntered", (e) => {
      this._onTownEntered(e.townId);
    }));

    this.rpgViewManager.onLeaveTown = () => {
      // Move party outside the town's 4×4 area to prevent re-entry on next step
      this._movePartyOutsideTown();
      this.rpgViewManager.currentTownData = null;
      this.rpgViewManager.currentTownName = "";
      this.rpgViewManager.currentArcaneLibData = null;
      this.stateMachine.transition(RPGPhase.OVERWORLD);
    };

    this.rpgViewManager.onBattleResultsDismissed = () => {
      const allCritical = this.rpgState.party.every(m => m.hp <= 1);
      if (allCritical && this.rpgState.gold === 0) {
        this.stateMachine.transition(RPGPhase.GAME_OVER);
      } else {
        this.stateMachine.returnToPrevious();
      }
    };

    this.rpgViewManager.onNPCDialogClosed = () => {
      this._npcDialogOpen = false;
    };
    this._unsubs.push(EventBus.on("rpgNPCInteraction", () => {
      this._npcDialogOpen = true;
    }));

    this.rpgViewManager.onHelpMenuToggled = (open) => {
      this._helpMenuOpen = open;
    };

    this.rpgViewManager.onInventoryClosed = () => {
      this._inventoryOpen = false;
    };

    this.rpgViewManager.onRestart = () => {
      this.destroy();
      this.boot();
    };

    this._unsubs.push(EventBus.on("rpgDungeonExited", () => {
      this.dungeonState = null;
      this.rpgViewManager.dungeonState = null;
      // Check for dungeon-exit leader spawns
      if (this.overworldState) {
        checkDungeonExitLeaderSpawn(this.rpgState, this.overworldState);
      }
    }));

    // Wire return to main menu from game over
    this.rpgViewManager.onMainMenu = () => {
      this.destroy();
      this.boot();
    };

    // Wire pause menu save
    this.rpgViewManager.onSaveGame = (slot: number) => {
      if (this.rpgState && this.overworldState) {
        saveGame(slot, this.rpgState, this.overworldState);
      }
    };

    // Wire pause menu quit to title
    this.rpgViewManager.onQuitToTitle = () => {
      this.destroy();
      this.boot();
    };

    // Wire pause menu close
    this.rpgViewManager.onPauseMenuClosed = () => {
      this._pauseMenuOpen = false;
    };

    // Wire spell learning — when a caster levels up, auto-learn available spells
    // (In future this can be replaced with a UI prompt for player selection)
    this._unsubs.push(EventBus.on("rpgSpellLearnPrompt", (e) => {
      const member = this.rpgState.party.find(m => m.id === e.memberId);
      if (!member) return;
      // Auto-pick: select the first N available spells (highest tier first for variety)
      const choices = (e.choices as UpgradeType[]).slice(0, e.picks as number);
      if (choices.length > 0) {
        const learned = learnSpells(member, choices);
        for (const spellId of learned) {
          EventBus.emit("rpgSpellLearned", { memberId: member.id, spellId });
        }
      }
    }));

    // When a caster has learned all available spells for their level
    this._unsubs.push(EventBus.on("rpgAllSpellsKnown", (e) => {
      // Add to battle log if in battle, otherwise the battle results will show it
      if (this._battleLevelUps) {
        this._battleLevelUps.push({
          name: e.memberName,
          newLevel: e.level,
          note: "Already knows all available spells!",
        });
      }
    }));
  }

  /** Show options screen (from main menu or in-game). */
  private _showOptions(fromMainMenu: boolean): void {
    this.rpgViewManager.showOptions(this._gameOptions, (opts) => {
      this._gameOptions = opts;
      if (this.rpgState) {
        this.rpgState.battleMode = opts.battleMode;
        this.rpgState.randomEncounterRate = opts.randomEncounterRate;
        this.rpgState.roamingEncounterRate = opts.roamingEncounterRate;
      }
    }, fromMainMenu);
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

      // Main menu / options phases — input handled by their views
      if (phase === RPGPhase.MAIN_MENU || phase === RPGPhase.OPTIONS) return;

      // Pause menu (Escape) during exploration
      if (e.code === "Escape" && (phase === RPGPhase.OVERWORLD || phase === RPGPhase.DUNGEON)) {
        if (this._pauseMenuOpen) {
          this.rpgViewManager.hidePauseMenu();
          this._pauseMenuOpen = false;
        } else if (!this._npcDialogOpen && !this._helpMenuOpen && !this._inventoryOpen) {
          this.rpgViewManager.showPauseMenu(this.rpgState, this.overworldState, this._gameOptions);
          this._pauseMenuOpen = true;
        }
        return;
      }

      // Block all gameplay input when pause menu is open
      if (this._pauseMenuOpen) return;

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

      if (this._npcDialogOpen || this._helpMenuOpen || this._inventoryOpen) return;

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
        dy = -1;
        break;
      case "ArrowDown":
        dy = 1;
        break;
      case "ArrowLeft":
        dx = -1;
        break;
      case "ArrowRight":
        dx = 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    moveParty(this.rpgState, this.overworldState, dx, dy, this.stateMachine);
  }

  private _handleDungeonInput(e: KeyboardEvent): void {
    if (!this.dungeonState) return;

    let dx = 0;
    let dy = 0;

    switch (e.code) {
      case "ArrowUp":
        dy = -1;
        break;
      case "ArrowDown":
        dy = 1;
        break;
      case "ArrowLeft":
        dx = -1;
        break;
      case "ArrowRight":
        dx = 1;
        break;
      case "Escape":
        // Can't escape dungeon from keyboard — must find stairs
        return;
      default:
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    moveDungeonParty(this.rpgState, this.dungeonState, dx, dy, this.stateMachine);
  }

  // ---------------------------------------------------------------------------
  // Town
  // ---------------------------------------------------------------------------

  /** Move the party to the first walkable tile outside the current town's 4×4 area. */
  private _movePartyOutsideTown(): void {
    const ow = this.overworldState;
    const pos = ow.partyPosition;
    const tile = ow.grid[pos.y]?.[pos.x];
    if (!tile?.entityId) return;

    const entity = ow.entities.get(tile.entityId);
    if (!entity || (entity.type !== "town" && entity.type !== "arcane_library")) return;

    const townX = entity.position.x;
    const townY = entity.position.y;
    const townSize = 4;

    // Scan all tiles around the 4×4 perimeter for a walkable non-entity tile
    const candidates: { x: number; y: number }[] = [];
    // Bottom edge (prefer: closest to party x)
    for (let dx = 0; dx < townSize; dx++) candidates.push({ x: townX + dx, y: townY + townSize });
    // Top edge
    for (let dx = 0; dx < townSize; dx++) candidates.push({ x: townX + dx, y: townY - 1 });
    // Right edge
    for (let dy = 0; dy < townSize; dy++) candidates.push({ x: townX + townSize, y: townY + dy });
    // Left edge
    for (let dy = 0; dy < townSize; dy++) candidates.push({ x: townX - 1, y: townY + dy });

    // Sort by distance to current party position
    candidates.sort((a, b) => {
      const da = Math.abs(a.x - pos.x) + Math.abs(a.y - pos.y);
      const db = Math.abs(b.x - pos.x) + Math.abs(b.y - pos.y);
      return da - db;
    });

    for (const c of candidates) {
      const t = ow.grid[c.y]?.[c.x];
      if (t && t.walkable && !t.entityId) {
        ow.partyPosition = { x: c.x, y: c.y };
        this.rpgState.overworldPosition = { x: c.x, y: c.y };
        return;
      }
    }
  }

  private _onTownEntered(townId: string): void {
    const entity = this.overworldState.entities.get(townId);
    if (!entity) return;

    if (entity.type === "town") {
      const townData = entity.data as TownData;
      this.rpgViewManager.currentTownData = townData;
      this.rpgViewManager.currentTownName = entity.name;
      this.rpgViewManager.currentArcaneLibData = null;
    } else if (entity.type === "arcane_library") {
      // Arcane Library uses a minimal TownData wrapper so the town menu can display
      const libData = entity.data as ArcaneLibraryData;
      const fakeTown: TownData = {
        shopItems: [],
        shopTier: "late",
        innCost: 0,
        quests: [],
        magicShopSpells: [],
      };
      this.rpgViewManager.currentTownData = fakeTown;
      this.rpgViewManager.currentTownName = entity.name;
      this.rpgViewManager.currentArcaneLibData = libData;
    }
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
    // Arena "Watch" forces auto-resolve regardless of the player's battle mode setting
    const effectiveMode = this._pendingArenaMode === "auto" ? "auto"
      : this._pendingArenaMode === "turn" ? "turn"
      : this.rpgState.battleMode;
    if (effectiveMode === "turn") {
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

      // Wire up view callbacks before transitioning — view is created during transition
      this.rpgViewManager.pendingBattleCallbacks = (view) => {
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
        view.onSpellSelected = (spellId: UpgradeType) => {
          this._handleSpellSelected(spellId);
        };
        view.onHelpRequested = () => {
          this.rpgViewManager.toggleHelpMenu();
        };
        view.refresh();

        // If first turn is enemy, execute it
        if (this.turnBattleState?.phase === TurnBattlePhase.ENEMY_TURN) {
          this._processEnemyTurns();
        }
      };

      // Transition to battle view (creates the view, which reads pendingBattleCallbacks)
      this.stateMachine.transition(RPGPhase.BATTLE_TURN);
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
        // Party AI: use ability if MP available and not a heal, else attack weakest reachable enemy
        const reachable = getValidTargets(battle, current.id);
        if (reachable.length === 0) break;
        reachable.sort((a, b) => a.hp - b.hp);
        const target = reachable[0];

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
    if (this._pendingArenaBet !== null) {
      // Arena fight — use arena-specific result handler
      applyArenaResult(this.rpgState, this._pendingArenaBet, victory);
      if (victory) {
        battle.xpReward = Math.floor(battle.xpReward * getBlessingXpMultiplier(this.rpgState));
        battle.goldReward = 0; // Gold handled by arena system
        applyVictoryRewards(this.rpgState, battle);
        if (this._pendingEncounterId) this._trackQuestKill(this._pendingEncounterId);
        if (this.overworldState) checkPostBattleLeaderSpawn(this.rpgState, this.overworldState);
      } else {
        for (const c of battle.combatants) {
          if (!c.isPartyMember) continue;
          const m = this.rpgState.party.find(p => p.id === c.id);
          if (m) m.hp = 1;
        }
        EventBus.emit("rpgBattleEnded", { victory: false, xp: 0, gold: 0 });
      }
    } else if (victory) {
      // Apply blessing multipliers to rewards before granting
      battle.xpReward = Math.floor(battle.xpReward * getBlessingXpMultiplier(this.rpgState));
      battle.goldReward = Math.floor(battle.goldReward * getBlessingGoldMultiplier(this.rpgState));
      applyVictoryRewards(this.rpgState, battle);
      if (this._pendingEncounterId) {
        this._trackQuestKill(this._pendingEncounterId);
      }
      // Check for post-battle leader spawns
      if (this.overworldState) {
        checkPostBattleLeaderSpawn(this.rpgState, this.overworldState);
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
      partyXpState: this.rpgState.party.map(m => ({ name: m.name, level: m.level, xp: m.xp, xpToNext: m.xpToNext })),
    };

    if (this._levelUpUnsub) {
      this._levelUpUnsub();
      this._levelUpUnsub = null;
    }
    this._battleLevelUps = [];
    this._pendingEncounterId = null;
    this._pendingArenaBet = null;
    this._pendingArenaMode = null;

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
      const currentId = this.turnBattleState.turnOrder[this.turnBattleState.currentTurnIndex];
      const isHealAction = action === TurnBattleAction.ITEM
        || (action === TurnBattleAction.ABILITY && isHealAbility(this.turnBattleState.selectedAbility));
      const targets = isHealAction
        ? this.turnBattleState.combatants.filter(c => c.hp > 0 && c.isPartyMember)
        : getValidTargets(this.turnBattleState, currentId);
      view.setSelectableTargets(targets);
    }
  }

  /** Pending spell for target selection. */
  private _pendingSpellId: UpgradeType | null = null;

  private _handleSpellSelected(spellId: UpgradeType): void {
    if (!this.turnBattleState) return;

    // Summon spells don't need a target
    if (isSummonSpell(spellId)) {
      executeAction(
        this.turnBattleState,
        TurnBattleAction.ABILITY,
        null,
        null,
        null,
        this.rpgState,
        spellId,
      );
      this._afterTurnAction();
      return;
    }

    // Heal/damage spells need target selection
    this._pendingSpellId = spellId;
    this.turnBattleState.selectedAction = TurnBattleAction.ABILITY;
    this.turnBattleState.phase = TurnBattlePhase.SELECT_TARGET;

    const view = this.rpgViewManager["turnBattleView"];
    if (view) {
      const currentId = this.turnBattleState.turnOrder[this.turnBattleState.currentTurnIndex];
      const targets = isHealSpell(spellId)
        ? this.turnBattleState.combatants.filter(c => c.hp > 0 && c.isPartyMember)
        : getValidTargets(this.turnBattleState, currentId);
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
      this._pendingSpellId,
    );

    this._pendingSpellId = null;
    this._afterTurnAction();
  }

  private _afterTurnAction(): void {
    if (!this.turnBattleState) return;

    const view = this.rpgViewManager["turnBattleView"];

    // Check for battle end states
    if (this.turnBattleState.phase === TurnBattlePhase.VICTORY) {
      if (this._pendingArenaBet !== null) {
        applyArenaResult(this.rpgState, this._pendingArenaBet, true);
        // Arena XP still applies
        this.turnBattleState.xpReward = Math.floor(this.turnBattleState.xpReward * getBlessingXpMultiplier(this.rpgState));
        this.turnBattleState.goldReward = 0; // Gold handled by arena system
        applyVictoryRewards(this.rpgState, this.turnBattleState);
      } else {
        // Apply blessing multipliers to rewards
        this.turnBattleState.xpReward = Math.floor(this.turnBattleState.xpReward * getBlessingXpMultiplier(this.rpgState));
        this.turnBattleState.goldReward = Math.floor(this.turnBattleState.goldReward * getBlessingGoldMultiplier(this.rpgState));
        applyVictoryRewards(this.rpgState, this.turnBattleState);
      }
      view?.refresh();
      // Return to previous phase after short delay
      setTimeout(() => this._returnFromBattle(true), 1500);
      return;
    }

    if (this.turnBattleState.phase === TurnBattlePhase.DEFEAT) {
      if (this._pendingArenaBet !== null) {
        applyArenaResult(this.rpgState, this._pendingArenaBet, false);
        // Sync HP (revive party at 1 HP like normal defeat)
        for (const c of this.turnBattleState.combatants) {
          if (!c.isPartyMember) continue;
          const m = this.rpgState.party.find(p => p.id === c.id);
          if (m) m.hp = 1;
        }
      } else {
        applyDefeatPenalty(this.rpgState, this.turnBattleState);
      }
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

  private _processingEnemyTurns = false;

  private _processEnemyTurns(): void {
    if (!this.turnBattleState || this._processingEnemyTurns) return;
    this._processingEnemyTurns = true;
    this._processNextEnemyTurn();
  }

  private _processNextEnemyTurn(): void {
    if (!this.turnBattleState) {
      this._processingEnemyTurns = false;
      return;
    }

    if ((this.turnBattleState.phase as string) !== TurnBattlePhase.ENEMY_TURN) {
      // Enemy turns done — refresh and return control to player
      this._processingEnemyTurns = false;
      const view = this.rpgViewManager["turnBattleView"];
      view?.refresh();
      return;
    }

    // Execute one enemy turn
    executeEnemyTurn(this.turnBattleState, this.rpgState);

    // Refresh view to show the action
    const view = this.rpgViewManager["turnBattleView"];
    view?.refresh();

    // Check end conditions
    const p = this.turnBattleState.phase as string;
    if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT) {
      this._processingEnemyTurns = false;
      this._afterTurnAction();
      return;
    }

    // Delay before next enemy turn so player can see each action
    setTimeout(() => this._processNextEnemyTurn(), 600);
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
      partyXpState: this.rpgState.party.map(m => ({ name: m.name, level: m.level, xp: m.xp, xpToNext: m.xpToNext })),
    };

    // Track quest kill objectives on victory
    if (victory && this._pendingEncounterId) {
      this._trackQuestKill(this._pendingEncounterId);
    }

    // Check for post-battle leader spawns
    if (victory && this.overworldState) {
      checkPostBattleLeaderSpawn(this.rpgState, this.overworldState);
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
    this._pendingArenaBet = null;
    this._pendingArenaMode = null;

    // Show results screen — phase transition happens on dismiss
    this.rpgViewManager.showBattleResults(results);
  }

  private _trackQuestKill(encounterId: string): void {
    updateKillObjective(this.rpgState, encounterId);
    checkQuestCompletion(this.rpgState);
    // Rewards are claimed when player returns to the quest NPC
  }
}
