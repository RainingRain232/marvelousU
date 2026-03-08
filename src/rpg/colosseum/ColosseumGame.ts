// Colosseum mode orchestrator — boots the game, manages tournament flow
import { ColosseumPhase, TurnBattleAction, TurnBattlePhase } from "@/types";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";
import type { TurnBattleState } from "@rpg/state/TurnBattleState";
import type { UpgradeType } from "@/types";
import {
  calculateInitiative,
  executeAction,
  executeEnemyTurn,
  advanceTurn,
  getValidTargets,
  isHealAbility,
  isHealSpell,
  isSummonSpell,
} from "@rpg/systems/TurnBattleSystem";
import { submitScore } from "@rpg/systems/LeaderboardSystem";
import { ColosseumStateMachine } from "./systems/ColosseumStateMachine";
import { ColosseumPersistence } from "./state/ColosseumPersistence";
import type { ColosseumSaveData } from "./state/ColosseumPersistence";
import type { ColosseumState, ColosseumTeam, ColosseumRuleset, TournamentMatch } from "./state/ColosseumState";
import { generateTournament, advanceBracket, getNextUnresolvedMatch, isPlayerInMatch, resolveAIMatch, calculatePowerLevel } from "./systems/TournamentSystem";
import { createBattleFromTeams } from "./systems/ColosseumBattleSystem";
import { placeBet, resolveBet } from "./systems/BettingSystem";
import type { BetResult } from "./systems/BettingSystem";
import { calculateEloChange, getOpponentElo } from "./systems/RankedSystem";
import { applyArenaXP } from "./systems/GladiatorProgressionSystem";
import type { ArenaXPResult } from "./systems/GladiatorProgressionSystem";
import { COLOSSEUM_TIERS } from "./config/ColosseumDefs";

// Views
import { ColosseumMenuView } from "./view/ColosseumMenuView";
import { PartySetupView } from "./view/PartySetupView";
import { TournamentBracketView } from "./view/TournamentBracketView";
import { ColosseumBettingView } from "./view/ColosseumBettingView";
import { ColosseumRankingsView } from "./view/ColosseumRankingsView";
import { TurnBattleView } from "@view/rpg/TurnBattleView";
import { BattleResultsView } from "@view/rpg/BattleResultsView";
import type { BattleResults } from "@view/rpg/BattleResultsView";

// ---------------------------------------------------------------------------
// ColosseumGame
// ---------------------------------------------------------------------------

export class ColosseumGame {
  private state!: ColosseumState;
  private stateMachine!: ColosseumStateMachine;
  private saved!: ColosseumSaveData;

  // Active views
  private _menuView: ColosseumMenuView | null = null;
  private _partySetupView: PartySetupView | null = null;
  private _bracketView: TournamentBracketView | null = null;
  private _bettingView: ColosseumBettingView | null = null;
  private _rankingsView: ColosseumRankingsView | null = null;
  private _battleView: TurnBattleView | null = null;
  private _resultsView: BattleResultsView | null = null;

  private _currentBattle: TurnBattleState | null = null;
  private _currentMatch: TournamentMatch | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _selectedTierIndex = 0;

  /** Stub RPGState for TurnBattleView and executeAction (reads battleSpeed, inventory). */
  private _rpgStub = {
    battleSpeed: 1,
    inventory: { items: [] as any[], maxSlots: 0 },
  };

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this.saved = ColosseumPersistence.load();
    this.stateMachine = new ColosseumStateMachine(ColosseumPhase.MAIN_MENU);

    this._showMainMenu();
  }

  destroy(): void {
    this._spectating = false;
    this._processingEnemyTurns = false;
    this._destroyAllViews();
    if (this._onKeyDown) {
      window.removeEventListener("keydown", this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Main menu
  // ---------------------------------------------------------------------------

  private _showMainMenu(): void {
    this._destroyAllViews();
    this.saved = ColosseumPersistence.load();

    this._menuView = new ColosseumMenuView();
    this._menuView.init(viewManager, this.saved, {
      onNewTournament: (tierIndex: number) => this._onNewTournament(tierIndex),
      onRankings: () => this._showRankings(),
      onBack: () => this._returnToMainMenu(),
    });
  }

  private _returnToMainMenu(): void {
    this._destroyAllViews();
    // Signal back to the game's main menu — dispatch a custom event
    window.dispatchEvent(new CustomEvent("colosseumExit"));
    // The main.ts listener should handle returning to MenuScreen
  }

  // ---------------------------------------------------------------------------
  // Party setup → Tournament start
  // ---------------------------------------------------------------------------

  private _onNewTournament(tierIndex: number): void {
    this._selectedTierIndex = tierIndex;
    this._destroyAllViews();

    const tier = COLOSSEUM_TIERS[tierIndex];
    if (!tier) return;

    // Check entry fee
    if (this.saved.gold < tier.entryFee) return;

    this._partySetupView = new PartySetupView();
    this._partySetupView.init(viewManager, this.saved, tier, {
      onConfirm: (team: ColosseumTeam, ruleset: ColosseumRuleset) => {
        this._startTournament(team, ruleset, tierIndex);
      },
      onBack: () => this._showMainMenu(),
    });

    this.stateMachine.transition(ColosseumPhase.PARTY_SETUP);
  }

  private _startTournament(playerTeam: ColosseumTeam, ruleset: ColosseumRuleset, tierIndex: number): void {
    const tier = COLOSSEUM_TIERS[tierIndex];

    // Deduct entry fee
    this.saved.gold -= tier.entryFee;
    this.saved.tournamentsPlayed++;
    ColosseumPersistence.save(this.saved);

    // Build state
    const seed = Date.now();
    playerTeam.powerLevel = calculatePowerLevel(playerTeam);
    const tournament = generateTournament(playerTeam, seed, ruleset);

    this.state = {
      phase: ColosseumPhase.TOURNAMENT_BRACKET,
      playerTeam,
      tournament,
      gold: this.saved.gold,
      elo: this.saved.elo,
      season: this.saved.season,
      seasonWins: this.saved.seasonWins,
      seasonLosses: this.saved.seasonLosses,
      tournamentsWon: this.saved.tournamentsWon,
      tournamentsPlayed: this.saved.tournamentsPlayed,
      ruleset,
      seed,
    };

    this.stateMachine.transition(ColosseumPhase.TOURNAMENT_BRACKET);
    this._showBracket();
  }

  // ---------------------------------------------------------------------------
  // Tournament bracket
  // ---------------------------------------------------------------------------

  private _showBracket(): void {
    this._destroyAllViews();

    if (!this.state.tournament) return;

    this._bracketView = new TournamentBracketView();
    this._bracketView.init(viewManager, this.state.tournament, this.state.playerTeam.id, this.state.gold, {
      onMatchSelected: (match: TournamentMatch) => this._onMatchSelected(match),
      onBack: () => this._showTournamentResults(false),
    });
  }

  // ---------------------------------------------------------------------------
  // Pre-match (betting + fight/watch)
  // ---------------------------------------------------------------------------

  private _onMatchSelected(match: TournamentMatch): void {
    this._destroyAllViews();
    this._currentMatch = match;

    if (!this.state.tournament) return;

    const playerInMatch = isPlayerInMatch(match, this.state.playerTeam.id);

    this.stateMachine.transition(ColosseumPhase.PRE_MATCH);

    this._bettingView = new ColosseumBettingView();
    this._bettingView.init(viewManager, match, this.state.tournament.teams, this.state.gold, playerInMatch, {
      onPlaceBet: (teamId: string, amount: number) => {
        if (placeBet(match, teamId, amount, this.state.gold)) {
          this.state.gold -= amount;
          this.saved.gold = this.state.gold;
          ColosseumPersistence.save(this.saved);
          this._bettingView?.updateGold(this.state.gold);
        }
      },
      onFight: () => {
        if (playerInMatch) {
          this._startPlayerBattle(match);
        } else {
          this._startSpectatorBattle(match);
        }
      },
      onAutoResolve: () => {
        this._autoResolveMatch(match);
      },
      onBack: () => {
        this._currentMatch = null;
        this.stateMachine.transition(ColosseumPhase.TOURNAMENT_BRACKET);
        this._showBracket();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Player battle (turn-based)
  // ---------------------------------------------------------------------------

  private _startPlayerBattle(match: TournamentMatch): void {
    this._destroyAllViews();

    if (!this.state.tournament) return;

    const team1 = this.state.tournament.teams.find(t => t.id === match.team1Id);
    const team2 = this.state.tournament.teams.find(t => t.id === match.team2Id);
    if (!team1 || !team2) return;

    // Determine which team is the player
    const isTeam1Player = team1.id === this.state.playerTeam.id;
    const playerTeam = isTeam1Player ? team1 : team2;
    const enemyTeam = isTeam1Player ? team2 : team1;

    const battle = createBattleFromTeams(playerTeam, enemyTeam, true, this.state.ruleset);
    if (this.state.ruleset.noItems) {
      battle.canUseItems = false;
    }
    this._currentBattle = battle;
    calculateInitiative(battle);

    this.stateMachine.transition(ColosseumPhase.BATTLE_TURN);

    this._battleView = new TurnBattleView();
    this._battleView.init(viewManager, battle, this._rpgStub as any);
    this._battleView.onActionSelected = (action: TurnBattleAction) => this._handleTurnAction(action);
    this._battleView.onTargetSelected = (targetId: string) => this._handleTargetSelected(targetId);
    this._battleView.onSpellSelected = (spellId: UpgradeType) => this._handleSpellSelected(spellId);
    this._battleView.onItemSelected = (itemId: string) => this._handleItemSelected(itemId);

    // If first turn is enemy, process it
    if (battle.phase === TurnBattlePhase.ENEMY_TURN) {
      this._processEnemyTurns();
    }
  }

  /** Pending spell for target selection (mirrors RPGBoot._pendingSpellId). */
  private _pendingSpellId: UpgradeType | null = null;
  private _processingEnemyTurns = false;

  private _handleTurnAction(action: TurnBattleAction): void {
    if (!this._currentBattle) return;

    // Actions that don't need a target
    if (action === TurnBattleAction.DEFEND || action === TurnBattleAction.FLEE) {
      executeAction(this._currentBattle, action, null, null, null, this._rpgStub as any);
      this._afterAction();
      return;
    }

    // ATTACK, ABILITY, ITEM, SWAP_ROW, LIMIT_BREAK — need target selection
    this._currentBattle.selectedAction = action;
    this._currentBattle.phase = TurnBattlePhase.SELECT_TARGET;

    if (action === TurnBattleAction.ABILITY) {
      const currentId = this._currentBattle.turnOrder[this._currentBattle.currentTurnIndex];
      const current = this._currentBattle.combatants.find(c => c.id === currentId);
      this._currentBattle.selectedAbility = current?.abilityTypes[0] ?? null;
    } else {
      this._currentBattle.selectedAbility = null;
    }

    if (this._battleView) {
      const currentId = this._currentBattle.turnOrder[this._currentBattle.currentTurnIndex];
      const isHealAction = action === TurnBattleAction.ITEM
        || (action === TurnBattleAction.ABILITY && isHealAbility(this._currentBattle.selectedAbility));
      const targets = isHealAction
        ? this._currentBattle.combatants.filter(c => c.hp > 0 && c.isPartyMember)
        : getValidTargets(this._currentBattle, currentId);
      this._battleView.setSelectableTargets(targets);
    }
  }

  private _handleSpellSelected(spellId: UpgradeType): void {
    if (!this._currentBattle) return;

    if (isSummonSpell(spellId)) {
      executeAction(this._currentBattle, TurnBattleAction.ABILITY, null, null, null, this._rpgStub as any, spellId);
      this._afterAction();
      return;
    }

    this._pendingSpellId = spellId;
    this._currentBattle.selectedAction = TurnBattleAction.ABILITY;
    this._currentBattle.phase = TurnBattlePhase.SELECT_TARGET;

    if (this._battleView) {
      const currentId = this._currentBattle.turnOrder[this._currentBattle.currentTurnIndex];
      const targets = isHealSpell(spellId)
        ? this._currentBattle.combatants.filter(c => c.hp > 0 && c.isPartyMember)
        : getValidTargets(this._currentBattle, currentId);
      this._battleView.setSelectableTargets(targets);
    }
  }

  private _handleTargetSelected(targetId: string): void {
    if (!this._currentBattle) return;
    const action = this._currentBattle.selectedAction;
    if (!action) return;

    executeAction(
      this._currentBattle,
      action,
      targetId,
      this._currentBattle.selectedAbility,
      this._currentBattle.selectedItemId,
      this._rpgStub as any,
      this._pendingSpellId,
    );

    this._pendingSpellId = null;
    this._afterAction();
  }

  private _handleItemSelected(itemId: string): void {
    if (!this._currentBattle) return;
    this._currentBattle.selectedItemId = itemId;
    this._currentBattle.selectedAction = TurnBattleAction.ITEM;
  }

  private _afterAction(): void {
    if (!this._currentBattle) return;

    const p = this._currentBattle.phase as string;
    if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT) {
      this._battleView?.refresh();
      setTimeout(() => this._onBattleEnd(p === TurnBattlePhase.VICTORY), 1500);
      return;
    }

    if (this._currentBattle.phase === TurnBattlePhase.ENEMY_TURN) {
      this._processEnemyTurns();
    }

    this._battleView?.refresh();
  }

  private _processEnemyTurns(): void {
    if (!this._currentBattle || this._processingEnemyTurns) return;
    this._processingEnemyTurns = true;
    this._processNextEnemyTurn();
  }

  private _processNextEnemyTurn(): void {
    if (!this._currentBattle) {
      this._processingEnemyTurns = false;
      return;
    }

    if ((this._currentBattle.phase as string) !== TurnBattlePhase.ENEMY_TURN) {
      this._processingEnemyTurns = false;
      this._battleView?.refresh();
      return;
    }

    executeEnemyTurn(this._currentBattle, this._rpgStub as any);
    this._battleView?.refresh();

    const p = this._currentBattle.phase as string;
    if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT) {
      this._processingEnemyTurns = false;
      this._afterAction();
      return;
    }

    // Delay between enemy turns so player can see each action
    setTimeout(() => this._processNextEnemyTurn(), 600);
  }

  // ---------------------------------------------------------------------------
  // Spectator / auto-resolve
  // ---------------------------------------------------------------------------

  private _spectating = false;

  private _startSpectatorBattle(match: TournamentMatch): void {
    this._destroyAllViews();
    if (!this.state.tournament) return;

    const team1 = this.state.tournament.teams.find(t => t.id === match.team1Id);
    const team2 = this.state.tournament.teams.find(t => t.id === match.team2Id);
    if (!team1 || !team2) return;

    const battle = createBattleFromTeams(team1, team2, false, this.state.ruleset);
    this._currentBattle = battle;
    this._currentMatch = match;
    this._spectating = true;
    calculateInitiative(battle);

    this.stateMachine.transition(ColosseumPhase.SPECTATE);

    this._battleView = new TurnBattleView();
    this._battleView.init(viewManager, battle, this._rpgStub as any);

    // Run spectator ticks — both sides AI-controlled
    this._spectatorTick();
  }

  private _spectatorTick(): void {
    if (!this._currentBattle || !this._spectating) return;

    const p = this._currentBattle.phase as string;
    if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT) {
      this._spectating = false;
      this._battleView?.refresh();
      const victory = p === TurnBattlePhase.VICTORY;
      // In spectator mode, "victory" means team1 won
      const winnerId = victory
        ? this._currentMatch!.team1Id
        : this._currentMatch!.team2Id;
      setTimeout(() => this._onMatchResolved(this._currentMatch!, winnerId, false), 1500);
      return;
    }

    const currentId = this._currentBattle.turnOrder[this._currentBattle.currentTurnIndex];
    const current = this._currentBattle.combatants.find(c => c.id === currentId);
    if (!current || current.hp <= 0) {
      advanceTurn(this._currentBattle);
      this._battleView?.refresh();
      setTimeout(() => this._spectatorTick(), 300);
      return;
    }

    if (current.isPartyMember) {
      // Team1 AI: attack weakest reachable enemy
      const reachable = getValidTargets(this._currentBattle, current.id);
      if (reachable.length === 0) {
        this._spectating = false;
        return;
      }
      reachable.sort((a, b) => a.hp - b.hp);
      const target = reachable[0];

      if (current.mp >= 10 && current.abilityTypes.length > 0 && !isHealAbility(current.abilityTypes[0])) {
        executeAction(this._currentBattle, TurnBattleAction.ABILITY, target.id, current.abilityTypes[0], null, this._rpgStub as any);
      } else {
        executeAction(this._currentBattle, TurnBattleAction.ATTACK, target.id, null, null, this._rpgStub as any);
      }
    } else {
      executeEnemyTurn(this._currentBattle, this._rpgStub as any);
    }

    this._battleView?.refresh();

    // Check battle end after action
    const p2 = this._currentBattle.phase as string;
    if (p2 === TurnBattlePhase.VICTORY || p2 === TurnBattlePhase.DEFEAT) {
      this._spectating = false;
      const victory = p2 === TurnBattlePhase.VICTORY;
      const winnerId = victory
        ? this._currentMatch!.team1Id
        : this._currentMatch!.team2Id;
      setTimeout(() => this._onMatchResolved(this._currentMatch!, winnerId, false), 1500);
      return;
    }

    // Next tick with delay
    setTimeout(() => this._spectatorTick(), 500);
  }

  private _autoResolveMatch(match: TournamentMatch): void {
    if (!this.state.tournament) return;

    const winnerId = resolveAIMatch(match, this.state.tournament.teams, this.state.ruleset);
    this._onMatchResolved(match, winnerId, false);
  }

  // ---------------------------------------------------------------------------
  // Battle end
  // ---------------------------------------------------------------------------

  private _onBattleEnd(victory: boolean): void {
    if (!this._currentMatch || !this.state.tournament) return;

    const match = this._currentMatch;
    const winnerId = victory ? this.state.playerTeam.id
      : (match.team1Id === this.state.playerTeam.id ? match.team2Id : match.team1Id);

    this._onMatchResolved(match, winnerId, true);
  }

  private _onMatchResolved(match: TournamentMatch, winnerId: string, wasPlayerBattle: boolean): void {
    if (!this.state.tournament) return;

    // Advance bracket
    advanceBracket(this.state.tournament, match.id, winnerId);

    // Resolve bet
    let betResult: BetResult | null = null;
    if (match.playerBet) {
      betResult = resolveBet(match, winnerId);
      if (betResult && betResult.won) {
        this.state.gold += betResult.payout;
      }
    }

    // Apply XP and ELO for player battles
    let xpResults: ArenaXPResult[] = [];
    const tier = COLOSSEUM_TIERS[this._selectedTierIndex];
    if (wasPlayerBattle && tier) {
      const playerWon = winnerId === this.state.playerTeam.id;

      // XP
      xpResults = applyArenaXP(this.state.playerTeam.members, tier.baseXPReward, playerWon);

      // Gold reward
      if (playerWon) {
        this.state.gold += tier.baseGoldReward;
        this.state.seasonWins++;
      } else {
        this.state.seasonLosses++;
      }

      // ELO
      const opponentTeam = this.state.tournament.teams.find(t =>
        t.id === (match.team1Id === this.state.playerTeam.id ? match.team2Id : match.team1Id));
      const opponentAvgLevel = opponentTeam
        ? Math.round(opponentTeam.members.reduce((s, m) => s + m.level, 0) / opponentTeam.members.length)
        : 5;
      const oppElo = getOpponentElo(opponentAvgLevel, this._selectedTierIndex);
      const eloChange = calculateEloChange(this.state.elo, oppElo, playerWon);
      this.state.elo = Math.max(0, this.state.elo + eloChange);
    }

    // Save
    this.saved.gold = this.state.gold;
    this.saved.elo = this.state.elo;
    this.saved.seasonWins = this.state.seasonWins;
    this.saved.seasonLosses = this.state.seasonLosses;
    this.saved.savedParty = [...this.state.playerTeam.members];
    this.saved.savedFormation = { ...this.state.playerTeam.formation };
    ColosseumPersistence.save(this.saved);

    // Show results
    this._destroyAllViews();
    this.stateMachine.transition(ColosseumPhase.POST_MATCH);

    const results: BattleResults = {
      victory: winnerId === this.state.playerTeam.id || !wasPlayerBattle,
      xpGained: xpResults.reduce((s, r) => s + r.xpGained, 0),
      goldGained: wasPlayerBattle && winnerId === this.state.playerTeam.id ? tier?.baseGoldReward ?? 0 : 0,
      lootItems: [],
      levelUps: xpResults.filter(r => r.leveledUp).map(r => ({ name: r.name, newLevel: r.newLevel })),
    };

    if (betResult) {
      if (betResult.won) {
        results.goldGained += betResult.payout;
      }
    }

    this._resultsView = new BattleResultsView();
    this._resultsView.init(viewManager, results);
    this._resultsView.onDismiss = () => {
      this._destroyAllViews();

      // Check if tournament is complete
      if (this.state.tournament?.isComplete) {
        const playerWonTournament = this.state.tournament.matches[6]?.winnerId === this.state.playerTeam.id;
        if (playerWonTournament) {
          this.saved.tournamentsWon++;
          ColosseumPersistence.save(this.saved);
        }
        this._showTournamentResults(playerWonTournament);
      } else if (!wasPlayerBattle || winnerId === this.state.playerTeam.id) {
        // Player still in tournament or was spectating
        this._advanceToNextMatch();
      } else {
        // Player eliminated
        this._showTournamentResults(false);
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Advance to next match
  // ---------------------------------------------------------------------------

  private _advanceToNextMatch(): void {
    if (!this.state.tournament) return;

    const next = getNextUnresolvedMatch(this.state.tournament);
    if (!next) {
      // All matches in current round resolved, check tournament complete
      if (this.state.tournament.isComplete) {
        const won = this.state.tournament.matches[6]?.winnerId === this.state.playerTeam.id;
        this._showTournamentResults(won);
      } else {
        this.stateMachine.transition(ColosseumPhase.TOURNAMENT_BRACKET);
        this._showBracket();
      }
      return;
    }

    this.stateMachine.transition(ColosseumPhase.TOURNAMENT_BRACKET);
    this._showBracket();
  }

  // ---------------------------------------------------------------------------
  // Tournament results
  // ---------------------------------------------------------------------------

  private _showTournamentResults(won: boolean): void {
    this._destroyAllViews();
    this.stateMachine.transition(ColosseumPhase.TOURNAMENT_RESULTS);

    // Submit ELO to leaderboard
    submitScore("colosseumElo", "Player", this.state?.elo ?? this.saved.elo);

    // Show a simple results screen using BattleResultsView
    const bonusGold = won ? COLOSSEUM_TIERS[this._selectedTierIndex]?.baseGoldReward ?? 0 : 0;
    if (won) {
      this.state.gold += bonusGold;
      this.saved.gold = this.state.gold;
      ColosseumPersistence.save(this.saved);
    }

    const results: BattleResults = {
      victory: won,
      xpGained: 0,
      goldGained: bonusGold,
      lootItems: [],
      levelUps: [],
    };

    this._resultsView = new BattleResultsView();
    this._resultsView.init(viewManager, results);
    this._resultsView.onDismiss = () => {
      this._showMainMenu();
    };
  }

  // ---------------------------------------------------------------------------
  // Rankings
  // ---------------------------------------------------------------------------

  private _showRankings(): void {
    this._destroyAllViews();
    this.stateMachine.transition(ColosseumPhase.RANKINGS);

    this._rankingsView = new ColosseumRankingsView();
    this._rankingsView.init(viewManager, this.saved, {
      onBack: () => this._showMainMenu(),
    });
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private _destroyAllViews(): void {
    if (this._menuView) { this._menuView.destroy(); this._menuView = null; }
    if (this._partySetupView) { this._partySetupView.destroy(); this._partySetupView = null; }
    if (this._bracketView) { this._bracketView.destroy(); this._bracketView = null; }
    if (this._bettingView) { this._bettingView.destroy(); this._bettingView = null; }
    if (this._rankingsView) { this._rankingsView.destroy(); this._rankingsView = null; }
    if (this._battleView) { this._battleView.destroy(); this._battleView = null; }
    if (this._resultsView) { this._resultsView.destroy(); this._resultsView = null; }
  }
}
