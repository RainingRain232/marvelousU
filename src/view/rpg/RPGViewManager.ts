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
import { RPGHud } from "./RPGHud";
import { BattleResultsView } from "./BattleResultsView";
import type { BattleResults } from "./BattleResultsView";
import { NPCDialogView } from "./NPCDialogView";
import { RPGHelpMenuView } from "./RPGHelpMenuView";
import { MinimapView } from "./MinimapView";
import { GameOverView } from "./GameOverView";
import { InventoryView } from "./InventoryView";
import { TransitionOverlay } from "./TransitionOverlay";
import { MainMenuView } from "./MainMenuView";
import { OptionsView } from "./OptionsView";
import type { GameOptions } from "./OptionsView";
import { PauseMenuView } from "./PauseMenuView";

// ---------------------------------------------------------------------------
// RPGViewManager
// ---------------------------------------------------------------------------

export class RPGViewManager {
  private overworldView: OverworldView | null = null;
  private dungeonView: DungeonView | null = null;
  private turnBattleView: TurnBattleView | null = null;
  private townMenuView: TownMenuView | null = null;
  private rpgHud: RPGHud | null = null;
  private battleResultsView: BattleResultsView | null = null;
  private npcDialogView: NPCDialogView | null = null;
  private helpMenuView: RPGHelpMenuView | null = null;
  private minimapView: MinimapView | null = null;
  private gameOverView: GameOverView | null = null;
  private inventoryView: InventoryView | null = null;
  private mainMenuView: MainMenuView | null = null;
  private optionsView: OptionsView | null = null;
  private pauseMenuView: PauseMenuView | null = null;
  private _unsubs: Array<() => void> = [];

  rpgState!: RPGState;
  overworldState!: OverworldState;
  dungeonState: DungeonState | null = null;
  turnBattleState: TurnBattleState | null = null;

  /** Set by RPGBoot when entering a town. */
  currentTownData: TownData | null = null;
  currentTownName: string = "";

  /** Called by RPGBoot to leave town. */
  onLeaveTown: (() => void) | null = null;

  /** Called when battle results are dismissed so RPGBoot can transition. */
  onBattleResultsDismissed: (() => void) | null = null;

  /** Called when NPC dialog is closed. */
  onNPCDialogClosed: (() => void) | null = null;

  /** Called when help menu is opened/closed. */
  onHelpMenuToggled: ((open: boolean) => void) | null = null;

  /** Called when player requests restart from Game Over screen. */
  onRestart: (() => void) | null = null;

  /** Called when inventory overlay is closed. */
  onInventoryClosed: (() => void) | null = null;

  /** Called to return to main menu (from game over). */
  onMainMenu: (() => void) | null = null;

  /** Called to save from pause menu. */
  onSaveGame: ((slot: number) => void) | null = null;

  /** Called to quit to title from pause menu. */
  onQuitToTitle: (() => void) | null = null;

  /** Called when pause menu is closed (so RPGBoot can update its flag). */
  onPauseMenuClosed: (() => void) | null = null;

  /** Pending callbacks to wire on TurnBattleView once it's created (deferred by transition). */
  pendingBattleCallbacks: ((view: TurnBattleView) => void) | null = null;

  init(
    rpgState: RPGState,
    overworldState: OverworldState,
  ): void {
    this.rpgState = rpgState;
    this.overworldState = overworldState;

    // Listen for phase changes
    this._unsubs.push(EventBus.on("rpgPhaseChanged", (e) => {
      this._onPhaseChanged(e.phase, e.previousPhase);
    }));

    // Listen for NPC interactions
    this._unsubs.push(EventBus.on("rpgNPCInteraction", (e) => {
      this._showNPCDialog(e.npcName, e.dialogue, e.npcId);
    }));

    // Start in overworld
    this._showOverworld();
  }

  destroy(): void {
    this._hideAll();
    this._hideHud();
    this._hideMinimap();
    this._hideBattleResults();
    this._hideNPCDialog();
    this._hideHelpMenu();
    this._hideGameOver();
    this._hideInventory();
    this.hideMainMenu();
    this.hideOptions();
    this.hidePauseMenu();
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
  }

  // ---------------------------------------------------------------------------
  // Public methods for RPGBoot
  // ---------------------------------------------------------------------------

  toggleHelpMenu(): void {
    if (this.helpMenuView) {
      this._hideHelpMenu();
    } else {
      this._showHelpMenu();
    }
  }

  toggleInventory(): void {
    if (this.inventoryView) {
      this._hideInventory();
    } else {
      this._showInventory();
    }
  }

  // ---------------------------------------------------------------------------
  // Main Menu
  // ---------------------------------------------------------------------------

  showMainMenu(
    onNewGame: () => void,
    onLoadGame: (slot: number) => void,
    onOptions: () => void,
  ): void {
    this.hideMainMenu();
    this.mainMenuView = new MainMenuView();
    this.mainMenuView.init(viewManager);
    this.mainMenuView.onNewGame = onNewGame;
    this.mainMenuView.onLoadGame = onLoadGame;
    this.mainMenuView.onOptions = onOptions;
  }

  hideMainMenu(): void {
    if (this.mainMenuView) {
      this.mainMenuView.destroy();
      this.mainMenuView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Options
  // ---------------------------------------------------------------------------

  showOptions(
    currentOptions: GameOptions,
    onChanged: (opts: GameOptions) => void,
    fromMainMenu: boolean,
  ): void {
    this.hideOptions();
    this.optionsView = new OptionsView();
    this.optionsView.init(viewManager, currentOptions);
    this.optionsView.onOptionsChanged = onChanged;
    this.optionsView.onClose = () => {
      this.hideOptions();
      if (fromMainMenu && this.mainMenuView) {
        // Main menu is still behind, just remove options overlay
      } else if (this.pauseMenuView) {
        // Return to pause menu — it's still behind
      }
    };
  }

  hideOptions(): void {
    if (this.optionsView) {
      this.optionsView.destroy();
      this.optionsView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Pause Menu
  // ---------------------------------------------------------------------------

  showPauseMenu(rpgState: RPGState, overworldState: OverworldState, gameOptions: GameOptions): void {
    this.hidePauseMenu();
    this.pauseMenuView = new PauseMenuView();
    this.pauseMenuView.init(viewManager, rpgState, overworldState);
    this.pauseMenuView.onResume = () => {
      this.hidePauseMenu();
      this.onPauseMenuClosed?.();
    };
    this.pauseMenuView.onSave = (slot) => {
      this.onSaveGame?.(slot);
    };
    this.pauseMenuView.onOptions = () => {
      this.showOptions(gameOptions, (opts) => {
        // Options are saved inside OptionsView
      }, false);
    };
    this.pauseMenuView.onQuitToTitle = () => {
      this.hidePauseMenu();
      this.onQuitToTitle?.();
    };
  }

  hidePauseMenu(): void {
    if (this.pauseMenuView) {
      this.pauseMenuView.destroy();
      this.pauseMenuView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Battle Results
  // ---------------------------------------------------------------------------

  showBattleResults(results: BattleResults): void {
    this._hideBattleResults();
    this.battleResultsView = new BattleResultsView();
    this.battleResultsView.init(viewManager, results);
    this.battleResultsView.onDismiss = () => {
      this._hideBattleResults();
      this.onBattleResultsDismissed?.();
    };
  }

  // ---------------------------------------------------------------------------
  // Phase transitions
  // ---------------------------------------------------------------------------

  private _onPhaseChanged(phase: RPGPhase, _prev: RPGPhase): void {
    // Major phase changes get a fade transition
    const isMajor = phase === RPGPhase.OVERWORLD
      || phase === RPGPhase.DUNGEON
      || phase === RPGPhase.BATTLE_TURN
      || phase === RPGPhase.TOWN_MENU
      || phase === RPGPhase.GAME_OVER;

    if (isMajor) {
      const overlay = new TransitionOverlay(viewManager);
      overlay.transition(() => {
        this._applyPhaseChange(phase);
      });
    } else {
      this._applyPhaseChange(phase);
    }
  }

  private _applyPhaseChange(phase: RPGPhase): void {
    this._hideAll();

    switch (phase) {
      case RPGPhase.OVERWORLD:
        this._showOverworld();
        break;
      case RPGPhase.DUNGEON:
        this._showDungeon();
        break;
      case RPGPhase.BATTLE_TURN:
        this._hideHud();
        this._hideMinimap();
        this._showTurnBattle();
        break;
      case RPGPhase.BATTLE_AUTO:
        this._hideHud();
        this._hideMinimap();
        break;
      case RPGPhase.TOWN_MENU:
        this._hideHud();
        this._hideMinimap();
        this._showTownMenu();
        break;
      case RPGPhase.GAME_OVER:
        this._hideHud();
        this._hideMinimap();
        this._showGameOver();
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
    this._showHud();
    this._showMinimap();
  }

  private _showDungeon(): void {
    if (!this.dungeonState) return;
    this.dungeonView = new DungeonView();
    this.dungeonView.init(viewManager, this.dungeonState, this.rpgState);
    this._showHud();
    this._hideMinimap(); // No minimap in dungeons (fog-of-war makes it less useful)
  }

  private _showTurnBattle(): void {
    if (!this.turnBattleState) return;
    this.turnBattleView = new TurnBattleView();
    this.turnBattleView.init(viewManager, this.turnBattleState, this.rpgState);

    // Apply deferred callbacks (set before transition started)
    if (this.pendingBattleCallbacks) {
      this.pendingBattleCallbacks(this.turnBattleView);
      this.pendingBattleCallbacks = null;
    }
  }

  private _showTownMenu(): void {
    if (!this.currentTownData) return;
    this.townMenuView = new TownMenuView();
    this.townMenuView.init(viewManager, this.rpgState, this.currentTownData, this.currentTownName);
    this.townMenuView.onLeave = () => {
      this.onLeaveTown?.();
    };
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _showHud(): void {
    this._hideHud();
    this.rpgHud = new RPGHud();
    this.rpgHud.init(viewManager, this.rpgState);
  }

  private _hideHud(): void {
    if (this.rpgHud) {
      this.rpgHud.destroy();
      this.rpgHud = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private _showMinimap(): void {
    this._hideMinimap();
    this.minimapView = new MinimapView();
    this.minimapView.init(viewManager, this.overworldState, this.rpgState);
  }

  private _hideMinimap(): void {
    if (this.minimapView) {
      this.minimapView.destroy();
      this.minimapView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Battle results
  // ---------------------------------------------------------------------------

  private _hideBattleResults(): void {
    if (this.battleResultsView) {
      this.battleResultsView.destroy();
      this.battleResultsView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // NPC Dialog
  // ---------------------------------------------------------------------------

  private _showNPCDialog(npcName: string, dialogue: string[], npcId?: string): void {
    this._hideNPCDialog();
    this.npcDialogView = new NPCDialogView();
    this.npcDialogView.init(viewManager, npcName, dialogue, npcId, this.rpgState);
    this.npcDialogView.onClose = () => {
      this._hideNPCDialog();
      this.onNPCDialogClosed?.();
    };
  }

  private _hideNPCDialog(): void {
    if (this.npcDialogView) {
      this.npcDialogView.destroy();
      this.npcDialogView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Help Menu
  // ---------------------------------------------------------------------------

  private _showHelpMenu(): void {
    this._hideHelpMenu();
    this.helpMenuView = new RPGHelpMenuView();
    this.helpMenuView.init(viewManager);
    this.helpMenuView.onClose = () => {
      this._hideHelpMenu();
    };
    this.onHelpMenuToggled?.(true);
  }

  private _hideHelpMenu(): void {
    if (this.helpMenuView) {
      this.helpMenuView.destroy();
      this.helpMenuView = null;
      this.onHelpMenuToggled?.(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Game Over
  // ---------------------------------------------------------------------------

  private _showGameOver(): void {
    this._hideGameOver();
    this.gameOverView = new GameOverView();
    this.gameOverView.init(viewManager);
    this.gameOverView.onRestart = () => {
      this._hideGameOver();
      this.onRestart?.();
    };
  }

  private _hideGameOver(): void {
    if (this.gameOverView) {
      this.gameOverView.destroy();
      this.gameOverView = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Inventory
  // ---------------------------------------------------------------------------

  private _showInventory(): void {
    this._hideInventory();
    this.inventoryView = new InventoryView();
    this.inventoryView.init(viewManager, this.rpgState);
    this.inventoryView.onClose = () => {
      this._hideInventory();
    };
  }

  private _hideInventory(): void {
    if (this.inventoryView) {
      this.inventoryView.destroy();
      this.inventoryView = null;
      this.onInventoryClosed?.();
    }
  }
}
