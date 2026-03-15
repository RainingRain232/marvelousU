// ---------------------------------------------------------------------------
// Grail Ball Manager — Main Game Orchestrator
// A Football Manager-style management game with Arthurian medieval fantasy.
// Handles game loop, screen navigation, input, and coordinates all systems.
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "@view/ViewManager";
import { audioManager } from "@audio/AudioManager";

import {
  Formation, TeamInstruction, TrainingType, FacilityType,
  GBM, TEAM_DEFS, FACILITY_UPGRADES,
} from "./GrailManagerConfig";

import {
  GMScreen, MatchPhase,
  createGrailManagerState, initNewGame,
  advanceWeek, updateLeagueTable, updateMoraleAfterMatch,
  advanceCupBracket, pickBestLineup, recalcFinances,
  saveGame, loadGame,
} from "./GrailManagerState";
import type { GrailManagerState } from "./GrailManagerState";

import { initLiveMatch, simulateMinute, quickSimMatch } from "./GrailManagerSim";
import { aiWeeklyDecisions, aiMatchDayDecisions } from "./GrailManagerAI";
import { GrailManagerRenderer } from "./GrailManagerRenderer";

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------

const _keys: Record<string, boolean> = {};
const _pressed: Record<string, boolean> = {};
let _mouseX = 0;
let _mouseY = 0;
let _mouseClicked = false;
let _mouseClickX = 0;
let _mouseClickY = 0;

function _onKeyDown(e: KeyboardEvent): void { _keys[e.code] = true; }
function _onKeyUp(e: KeyboardEvent): void { _keys[e.code] = false; }
function _justPressed(code: string): boolean {
  if (_keys[code] && !_pressed[code]) {
    _pressed[code] = true;
    return true;
  }
  if (!_keys[code]) _pressed[code] = false;
  return false;
}

function _onMouseMove(e: MouseEvent): void {
  const canvas = viewManager.app.canvas as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  _mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  _mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
}

function _onMouseClick(e: MouseEvent): void {
  _onMouseMove(e);
  _mouseClicked = true;
  _mouseClickX = _mouseX;
  _mouseClickY = _mouseY;
}

// ---------------------------------------------------------------------------
// GrailManagerGame
// ---------------------------------------------------------------------------

export class GrailManagerGame {
  private _state!: GrailManagerState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _renderer = new GrailManagerRenderer();
  private _matchSimTimer = 0;
  private _pendingMatchFixtures: { homeTeamId: string; awayTeamId: string; week: number; fixtureIndex: number }[] = [];
  private _pendingCupMatch: { team1Id: string; team2Id: string; cupIndex: number } | null = null;

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  async boot(): Promise<void> {
    viewManager.clearWorld();
    audioManager.playGameMusic();

    this._state = createGrailManagerState();

    // Renderer
    this._renderer.build();
    viewManager.addToLayer("ui", this._renderer.container);

    // Input
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
    window.addEventListener("mousemove", _onMouseMove);
    window.addEventListener("click", _onMouseClick);

    // Game loop
    this._tickerCb = (ticker: Ticker) => {
      const dt = ticker.deltaMS / 1000;
      const sw = viewManager.screenWidth;
      const sh = viewManager.screenHeight;
      this._update(dt);
      this._renderer.update(this._state, sw, sh, dt, _mouseX, _mouseY);

      // Process click after render (so click zones are populated)
      if (_mouseClicked) {
        this._handleClick(_mouseClickX, _mouseClickY);
        _mouseClicked = false;
      }
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  private _update(dt: number): void {
    const state = this._state;

    switch (state.screen) {
      case GMScreen.MAIN_MENU:
        this._handleMainMenu();
        break;
      case GMScreen.NEW_GAME_SETUP:
        this._handleNewGameSetup();
        break;
      case GMScreen.DASHBOARD:
      case GMScreen.SQUAD:
      case GMScreen.TACTICS:
      case GMScreen.TRANSFERS:
      case GMScreen.FACILITIES:
      case GMScreen.LEAGUE:
      case GMScreen.CUP:
      case GMScreen.CALENDAR:
      case GMScreen.RULES:
      case GMScreen.PLAYER_DETAIL:
      case GMScreen.SAVE_LOAD:
        this._handleNavigation();
        this._handleScreenSpecific();
        break;
      case GMScreen.MATCH:
        this._handleMatchDay(dt);
        break;
      case GMScreen.MATCH_RESULT:
        this._handleMatchResult();
        break;
      case GMScreen.SEASON_END:
        this._handleSeasonEnd();
        break;
    }

    // Global scroll
    if (_justPressed("ArrowDown")) {
      state.scrollOffset = Math.min(state.scrollOffset + 3, 200);
    }
    if (_justPressed("ArrowUp")) {
      state.scrollOffset = Math.max(0, state.scrollOffset - 3);
    }
  }

  // -------------------------------------------------------------------------
  // Main Menu
  // -------------------------------------------------------------------------
  private _handleMainMenu(): void {
    if (_justPressed("KeyN")) {
      this._state.screen = GMScreen.NEW_GAME_SETUP;
    }
    if (_justPressed("KeyL")) {
      this._tryLoadGame(0);
    }
    if (_justPressed("KeyR")) {
      this._state.screen = GMScreen.RULES;
      this._state.scrollOffset = 0;
    }
    if (_justPressed("Escape")) {
      window.dispatchEvent(new Event("gameExit"));
    }
  }

  // -------------------------------------------------------------------------
  // New Game Setup
  // -------------------------------------------------------------------------
  private _handleNewGameSetup(): void {
    if (_justPressed("Escape")) {
      this._state.screen = GMScreen.MAIN_MENU;
      return;
    }

    for (let i = 0; i < TEAM_DEFS.length; i++) {
      if (_justPressed(`Digit${i + 1}`)) {
        initNewGame(this._state, TEAM_DEFS[i].id, "Sir Manager");
        this._state.screen = GMScreen.DASHBOARD;
        return;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Screen Navigation (Tab/Number keys)
  // -------------------------------------------------------------------------
  private _handleNavigation(): void {
    const state = this._state;

    if (_justPressed("Digit1")) { state.screen = GMScreen.DASHBOARD; state.scrollOffset = 0; }
    if (_justPressed("Digit2")) { state.screen = GMScreen.SQUAD; state.scrollOffset = 0; }
    if (_justPressed("Digit3")) { state.screen = GMScreen.TACTICS; state.scrollOffset = 0; }
    if (_justPressed("Digit4")) { state.screen = GMScreen.MATCH; state.scrollOffset = 0; }
    if (_justPressed("Digit5")) { state.screen = GMScreen.TRANSFERS; state.scrollOffset = 0; }
    if (_justPressed("Digit6")) { state.screen = GMScreen.FACILITIES; state.scrollOffset = 0; }
    if (_justPressed("Digit7")) { state.screen = GMScreen.LEAGUE; state.scrollOffset = 0; }
    if (_justPressed("Digit8")) { state.screen = GMScreen.CUP; state.scrollOffset = 0; }
    if (_justPressed("Digit9")) { state.screen = GMScreen.CALENDAR; state.scrollOffset = 0; }
    if (_justPressed("Digit0")) { state.screen = GMScreen.RULES; state.scrollOffset = 0; }
    if (_justPressed("KeyS")) { state.screen = GMScreen.SAVE_LOAD; }

    if (_justPressed("Escape")) {
      if (state.screen === GMScreen.PLAYER_DETAIL) {
        state.screen = GMScreen.SQUAD;
        state.selectedPlayerId = null;
      } else if (state.screen === GMScreen.RULES && !state.gameStarted) {
        state.screen = GMScreen.MAIN_MENU;
      } else if (state.screen === GMScreen.SAVE_LOAD) {
        state.screen = GMScreen.DASHBOARD;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Screen-specific keyboard handling
  // -------------------------------------------------------------------------
  private _handleScreenSpecific(): void {
    const state = this._state;

    if (state.screen === GMScreen.DASHBOARD) {
      if (_justPressed("Enter")) {
        this._advanceWeek();
      }
    }

    if (state.screen === GMScreen.SQUAD) {
      // Player selection with mouse is handled in click handler
    }

    if (state.screen === GMScreen.TACTICS) {
      // F key cycles formations
      if (_justPressed("KeyF")) {
        const team = state.teams[state.playerTeamId];
        if (team) {
          const formations = Object.values(Formation);
          const idx = formations.indexOf(team.formation);
          team.formation = formations[(idx + 1) % formations.length];
          const result = pickBestLineup(team.squad, team.formation);
          team.startingLineup = result.lineup.map(p => p.id);
          team.substitutes = result.subs.map(p => p.id);
        }
      }
      // I key cycles instructions
      if (_justPressed("KeyI")) {
        const team = state.teams[state.playerTeamId];
        if (team) {
          const instructions = Object.values(TeamInstruction);
          const idx = instructions.indexOf(team.instruction);
          team.instruction = instructions[(idx + 1) % instructions.length];
        }
      }
      // T key cycles training
      if (_justPressed("KeyT")) {
        const team = state.teams[state.playerTeamId];
        if (team) {
          const trainings = Object.values(TrainingType);
          const idx = trainings.indexOf(team.trainingType);
          team.trainingType = trainings[(idx + 1) % trainings.length];
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Match Day
  // -------------------------------------------------------------------------
  private _handleMatchDay(dt: number): void {
    const state = this._state;
    const match = state.liveMatch;

    // Nav out if no match
    if (!match) {
      this._handleNavigation();
      return;
    }

    // Speed controls
    if (_justPressed("Equal") || _justPressed("NumpadAdd")) {
      match.speed = match.speed === 1 ? 3 : match.speed === 3 ? 10 : 10;
    }
    if (_justPressed("Minus") || _justPressed("NumpadSubtract")) {
      match.speed = match.speed === 10 ? 3 : match.speed === 3 ? 1 : 1;
    }

    // Simulate
    if (!match.simulationComplete) {
      this._matchSimTimer += dt * match.speed;
      const simInterval = 0.8; // seconds between events at x1

      while (this._matchSimTimer >= simInterval && !match.simulationComplete) {
        this._matchSimTimer -= simInterval;
        simulateMinute(state, match);
      }
    }

    // Continue from full time
    if (match.simulationComplete || match.phase === MatchPhase.FULL_TIME) {
      if (_justPressed("Enter") || _justPressed("Space")) {
        this._finalizeMatch();
      }
    }

    // Space to advance through halftime
    if (match.phase === MatchPhase.HALF_TIME) {
      if (_justPressed("Space")) {
        simulateMinute(state, match); // This will transition to second half
      }
    }
  }

  // -------------------------------------------------------------------------
  // Match Result screen
  // -------------------------------------------------------------------------
  private _handleMatchResult(): void {
    if (_justPressed("Enter") || _justPressed("Space")) {
      this._state.screen = GMScreen.DASHBOARD;
      this._processRemainingMatches();
    }
  }

  // -------------------------------------------------------------------------
  // Season End
  // -------------------------------------------------------------------------
  private _handleSeasonEnd(): void {
    if (_justPressed("Enter")) {
      this._startNextSeason();
    }
    if (_justPressed("Escape")) {
      this._state.screen = GMScreen.MAIN_MENU;
    }
  }

  // -------------------------------------------------------------------------
  // Click Handler
  // -------------------------------------------------------------------------
  private _handleClick(x: number, y: number): void {
    const state = this._state;
    const zones = this._renderer.clickZones;

    let clickedId = "";
    for (const zone of zones) {
      if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
        clickedId = zone.id;
        break;
      }
    }

    if (!clickedId) return;

    // Main menu
    if (clickedId === "menu_new") {
      state.screen = GMScreen.NEW_GAME_SETUP;
      return;
    }
    if (clickedId === "menu_load") {
      this._tryLoadGame(0);
      return;
    }
    if (clickedId === "menu_rules") {
      state.screen = GMScreen.RULES;
      state.scrollOffset = 0;
      return;
    }
    if (clickedId === "menu_exit") {
      window.dispatchEvent(new Event("gameExit"));
      return;
    }

    // Team selection
    if (clickedId.startsWith("team_")) {
      const idx = parseInt(clickedId.split("_")[1]);
      if (idx >= 0 && idx < TEAM_DEFS.length) {
        initNewGame(state, TEAM_DEFS[idx].id, "Sir Manager");
        state.screen = GMScreen.DASHBOARD;
      }
      return;
    }

    // Tab navigation
    if (clickedId.startsWith("tab_")) {
      const screen = clickedId.replace("tab_", "") as GMScreen;
      state.screen = screen;
      state.scrollOffset = 0;
      return;
    }

    // Advance week
    if (clickedId === "advance_week") {
      this._advanceWeek();
      return;
    }

    // Player selection
    if (clickedId.startsWith("player_")) {
      const playerId = clickedId.replace("player_", "");
      state.selectedPlayerId = playerId;
      state.screen = GMScreen.PLAYER_DETAIL;
      return;
    }

    // Formation click
    if (clickedId.startsWith("formation_")) {
      const idx = parseInt(clickedId.split("_")[1]);
      const formations = Object.values(Formation);
      const team = state.teams[state.playerTeamId];
      if (team && idx < formations.length) {
        team.formation = formations[idx];
        const result = pickBestLineup(team.squad, team.formation);
        team.startingLineup = result.lineup.map(p => p.id);
        team.substitutes = result.subs.map(p => p.id);
      }
      return;
    }

    // Instruction click
    if (clickedId.startsWith("instruction_")) {
      const idx = parseInt(clickedId.split("_")[1]);
      const instructions = Object.values(TeamInstruction);
      const team = state.teams[state.playerTeamId];
      if (team && idx < instructions.length) {
        team.instruction = instructions[idx];
      }
      return;
    }

    // Training click
    if (clickedId.startsWith("training_")) {
      const idx = parseInt(clickedId.split("_")[1]);
      const trainings = Object.values(TrainingType);
      const team = state.teams[state.playerTeamId];
      if (team && idx < trainings.length) {
        team.trainingType = trainings[idx];
      }
      return;
    }

    // Transfer buy
    if (clickedId.startsWith("buy_")) {
      const idx = parseInt(clickedId.split("_")[1]);
      this._buyPlayer(idx);
      return;
    }

    // Facility build
    if (clickedId.startsWith("build_")) {
      const facilityType = clickedId.replace("build_", "") as FacilityType;
      this._buildFacility(facilityType);
      return;
    }

    // Match speed
    if (clickedId.startsWith("speed_")) {
      const speed = parseInt(clickedId.split("_")[1]);
      if (state.liveMatch) {
        state.liveMatch.speed = speed;
      }
      return;
    }

    // Match continue
    if (clickedId === "match_continue") {
      this._finalizeMatch();
      return;
    }

    // Result continue
    if (clickedId === "result_continue") {
      state.screen = GMScreen.DASHBOARD;
      this._processRemainingMatches();
      return;
    }

    // Next season
    if (clickedId === "next_season") {
      this._startNextSeason();
      return;
    }

    // Save/Load
    if (clickedId.startsWith("save_")) {
      const slot = parseInt(clickedId.split("_")[1]);
      if (saveGame(state, slot)) {
        state.news.push({ week: state.currentWeek, text: `Game saved to slot ${slot + 1}!`, type: "info" });
      }
      return;
    }
    if (clickedId.startsWith("load_")) {
      const slot = parseInt(clickedId.split("_")[1]);
      this._tryLoadGame(slot);
      return;
    }

    // Save game from header
    if (clickedId === "save_game") {
      state.screen = GMScreen.SAVE_LOAD;
      return;
    }
  }

  // -------------------------------------------------------------------------
  // Advance Week
  // -------------------------------------------------------------------------
  private _advanceWeek(): void {
    const state = this._state;

    // AI weekly decisions
    aiWeeklyDecisions(state);

    // Advance the week
    const { leagueFixtures, cupMatch, events } = advanceWeek(state);

    // Check for season end
    if (events.includes("SEASON_END")) {
      this._endSeason();
      return;
    }

    // Check for player match this week
    const playerFixture = leagueFixtures.find(f =>
      f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId
    );

    // Store other fixtures for later simulation
    this._pendingMatchFixtures = leagueFixtures
      .filter(f => f !== playerFixture)
      .map(f => ({
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        week: f.week,
        fixtureIndex: state.fixtures.indexOf(f),
      }));

    // Cup match
    if (cupMatch && (cupMatch.team1Id === state.playerTeamId || cupMatch.team2Id === state.playerTeamId)) {
      this._pendingCupMatch = {
        team1Id: cupMatch.team1Id,
        team2Id: cupMatch.team2Id,
        cupIndex: state.cupMatches.indexOf(cupMatch),
      };
    } else if (cupMatch) {
      // AI cup match
      const result = quickSimMatch(state, cupMatch.team1Id, cupMatch.team2Id);
      cupMatch.team1Goals = result.homeGoals;
      cupMatch.team2Goals = result.awayGoals;
      cupMatch.played = true;
      cupMatch.winnerId = result.homeGoals >= result.awayGoals ? cupMatch.team1Id : cupMatch.team2Id;
      advanceCupBracket(state);
      state.news.push({
        week: state.currentWeek,
        text: `Cup: ${state.teams[cupMatch.team1Id]?.teamDef.name} ${result.homeGoals}-${result.awayGoals} ${state.teams[cupMatch.team2Id]?.teamDef.name}`,
        type: "match",
      });
    }

    if (playerFixture) {
      // Start live match for player
      const homeId = playerFixture.homeTeamId;
      const awayId = playerFixture.awayTeamId;

      // AI match-day decisions for opponent
      aiMatchDayDecisions(state, homeId === state.playerTeamId ? awayId : homeId);

      state.liveMatch = initLiveMatch(state, homeId, awayId);
      state.screen = GMScreen.MATCH;
      this._matchSimTimer = 0;
    } else if (this._pendingCupMatch) {
      // Player cup match
      const cm = this._pendingCupMatch;
      const homeId = cm.team1Id;
      const awayId = cm.team2Id;
      aiMatchDayDecisions(state, homeId === state.playerTeamId ? awayId : homeId);
      state.liveMatch = initLiveMatch(state, homeId, awayId);
      state.screen = GMScreen.MATCH;
      this._matchSimTimer = 0;
      this._pendingCupMatch = null;
    } else {
      // No player match this week - simulate AI matches and stay on dashboard
      this._processRemainingMatches();

      // Add event news
      for (const evt of events) {
        if (evt !== "SEASON_END") {
          state.news.push({ week: state.currentWeek, text: evt, type: "info" });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Finalize match (after live sim completes)
  // -------------------------------------------------------------------------
  private _finalizeMatch(): void {
    const state = this._state;
    const match = state.liveMatch;
    if (!match) return;

    // Find and update the fixture
    const fixture = state.fixtures.find(f =>
      !f.played && f.homeTeamId === match.homeTeamId && f.awayTeamId === match.awayTeamId
    );

    if (fixture) {
      fixture.played = true;
      fixture.homeGoals = match.homeGoals;
      fixture.awayGoals = match.awayGoals;
      fixture.events = match.commentary.map(c => `${c.minute}': ${c.text}`);
      updateLeagueTable(state, fixture);
    } else {
      // Might be a cup match
      const cupMatch = state.cupMatches.find(m =>
        !m.played && m.team1Id === match.homeTeamId && m.team2Id === match.awayTeamId
      );
      if (cupMatch) {
        cupMatch.played = true;
        cupMatch.team1Goals = match.homeGoals;
        cupMatch.team2Goals = match.awayGoals;
        cupMatch.winnerId = match.homeGoals >= match.awayGoals ? match.homeTeamId : match.awayTeamId;
        advanceCupBracket(state);

        if (cupMatch.winnerId !== state.playerTeamId) {
          state.playerCupEliminated = true;
          state.news.push({ week: state.currentWeek, text: "We have been eliminated from the Camelot Cup.", type: "match" });
        } else {
          state.news.push({ week: state.currentWeek, text: `We advance in the Camelot Cup! ${match.homeGoals}-${match.awayGoals}`, type: "achievement" });
        }
      }
    }

    // Update morale
    const homeTeam = state.teams[match.homeTeamId];
    const awayTeam = state.teams[match.awayTeamId];
    if (homeTeam) updateMoraleAfterMatch(homeTeam, match.homeGoals > match.awayGoals, match.homeGoals === match.awayGoals);
    if (awayTeam) updateMoraleAfterMatch(awayTeam, match.awayGoals > match.homeGoals, match.homeGoals === match.awayGoals);

    // Update player match stats
    for (const pid of match.homeLineup) {
      const p = homeTeam?.squad.find(pl => pl.id === pid);
      if (p) {
        p.matchesPlayed++;
        p.rating = (p.rating * (p.matchesPlayed - 1) + (match.homeRatings[pid] || 6)) / p.matchesPlayed;
      }
    }
    for (const pid of match.awayLineup) {
      const p = awayTeam?.squad.find(pl => pl.id === pid);
      if (p) {
        p.matchesPlayed++;
        p.rating = (p.rating * (p.matchesPlayed - 1) + (match.awayRatings[pid] || 6)) / p.matchesPlayed;
      }
    }

    // Update manager stats
    const isUserHome = match.homeTeamId === state.playerTeamId;
    const userGoals = isUserHome ? match.homeGoals : match.awayGoals;
    const oppGoals = isUserHome ? match.awayGoals : match.homeGoals;
    if (userGoals > oppGoals) { state.managerWins++; state.managerReputation = Math.min(100, state.managerReputation + 2); }
    else if (userGoals === oppGoals) { state.managerDraws++; state.managerReputation = Math.min(100, state.managerReputation + 1); }
    else { state.managerLosses++; state.managerReputation = Math.max(0, state.managerReputation - 2); }

    // Save match result for display
    state.lastMatchResult = {
      home: match.homeTeamId,
      away: match.awayTeamId,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      commentary: match.commentary,
    };

    // News
    const homeName = homeTeam?.teamDef.name ?? match.homeTeamId;
    const awayName = awayTeam?.teamDef.name ?? match.awayTeamId;
    state.news.push({
      week: state.currentWeek,
      text: `${homeName} ${match.homeGoals}-${match.awayGoals} ${awayName}`,
      type: "match",
    });

    state.liveMatch = null;
    state.screen = GMScreen.MATCH_RESULT;
  }

  // -------------------------------------------------------------------------
  // Process remaining (AI) matches for the week
  // -------------------------------------------------------------------------
  private _processRemainingMatches(): void {
    const state = this._state;

    for (const pending of this._pendingMatchFixtures) {
      const fixture = state.fixtures[pending.fixtureIndex];
      if (!fixture || fixture.played) continue;

      const result = quickSimMatch(state, pending.homeTeamId, pending.awayTeamId);
      fixture.played = true;
      fixture.homeGoals = result.homeGoals;
      fixture.awayGoals = result.awayGoals;
      updateLeagueTable(state, fixture);

      // Morale for AI teams
      const homeTeam = state.teams[pending.homeTeamId];
      const awayTeam = state.teams[pending.awayTeamId];
      if (homeTeam) updateMoraleAfterMatch(homeTeam, result.homeGoals > result.awayGoals, result.homeGoals === result.awayGoals);
      if (awayTeam) updateMoraleAfterMatch(awayTeam, result.awayGoals > result.homeGoals, result.homeGoals === result.awayGoals);

      // News for notable results
      if (homeTeam && awayTeam) {
        state.news.push({
          week: state.currentWeek,
          text: `${homeTeam.teamDef.shortName} ${result.homeGoals}-${result.awayGoals} ${awayTeam.teamDef.shortName}`,
          type: "match",
        });
      }
    }

    this._pendingMatchFixtures = [];
  }

  // -------------------------------------------------------------------------
  // Buy player from transfer market
  // -------------------------------------------------------------------------
  private _buyPlayer(marketIndex: number): void {
    const state = this._state;
    if (marketIndex >= state.transferMarket.length) return;

    const listing = state.transferMarket[marketIndex];
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    if (state.gold < listing.askingPrice) return;
    if (team.squad.length >= GBM.SQUAD_MAX) {
      state.news.push({ week: state.currentWeek, text: "Squad is full! Cannot sign more players.", type: "info" });
      return;
    }

    // Buy
    state.gold -= listing.askingPrice;
    state.seasonExpenses += listing.askingPrice;

    // If from another team, remove from their squad
    if (listing.fromTeamId !== "free_agent" && state.teams[listing.fromTeamId]) {
      const fromTeam = state.teams[listing.fromTeamId];
      fromTeam.squad = fromTeam.squad.filter(p => p.id !== listing.player.id);
    }

    team.squad.push({ ...listing.player });
    state.transferMarket.splice(marketIndex, 1);

    state.news.push({
      week: state.currentWeek,
      text: `Signed ${listing.player.firstName} ${listing.player.lastName} for ${listing.askingPrice}g!`,
      type: "transfer",
    });

    recalcFinances(state);
  }

  // -------------------------------------------------------------------------
  // Build facility
  // -------------------------------------------------------------------------
  private _buildFacility(facilityType: FacilityType): void {
    const state = this._state;
    const currentLevel = state.facilities[facilityType];
    const upgrade = FACILITY_UPGRADES.find(u => u.type === facilityType && u.level === currentLevel + 1);
    if (!upgrade) return;
    if (state.gold < upgrade.cost) return;
    if (state.constructions.some(c => c.type === facilityType)) return;

    state.gold -= upgrade.cost;
    state.seasonExpenses += upgrade.cost;
    state.constructions.push({
      type: facilityType,
      targetLevel: upgrade.level,
      weeksRemaining: upgrade.weeksToComplete,
    });

    state.news.push({
      week: state.currentWeek,
      text: `Construction started: ${upgrade.description} (${upgrade.weeksToComplete} weeks)`,
      type: "facility",
    });
  }

  // -------------------------------------------------------------------------
  // End Season
  // -------------------------------------------------------------------------
  private _endSeason(): void {
    const state = this._state;

    // Check league winner
    const champion = state.leagueTable[0];
    if (champion.teamId === state.playerTeamId) {
      state.trophies.push(`League Champion Season ${state.season}`);
      state.managerReputation = Math.min(100, state.managerReputation + 15);
    }

    // Check cup winner
    const cupFinal = state.cupMatches.find(m => m.round === 2 && m.played);
    if (cupFinal && cupFinal.winnerId === state.playerTeamId) {
      state.trophies.push(`Camelot Cup Winner Season ${state.season}`);
      state.managerReputation = Math.min(100, state.managerReputation + 10);
    }

    state.screen = GMScreen.SEASON_END;
  }

  // -------------------------------------------------------------------------
  // Start Next Season
  // -------------------------------------------------------------------------
  private _startNextSeason(): void {
    const state = this._state;
    state.season++;
    state.currentWeek = 0;
    state.seasonRevenue = 0;
    state.seasonExpenses = 0;
    state.playerCupEliminated = false;

    // Age all players
    for (const ts of Object.values(state.teams)) {
      for (const p of ts.squad) {
        p.age++;
        p.goals = 0;
        p.assists = 0;
        p.matchesPlayed = 0;
        p.rating = 6.0;
        p.form = 0;
        p.contractYears--;
        p.isYouth = p.age <= 19;

        // Contract expired
        if (p.contractYears <= 0) {
          p.contractYears = 0;
          // AI renews, player gets notification
          if (ts.teamDef.id !== state.playerTeamId) {
            p.contractYears = 2 + Math.floor(Math.random() * 3);
          }
        }
      }
    }

    // Generate new fixtures
    const teamIds = TEAM_DEFS.map(t => t.id);
    state.fixtures = generateFixturesInline(teamIds);

    // Reset league table
    state.leagueTable = teamIds.map(id => ({
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: [],
    }));

    // New cup bracket
    state.cupMatches = generateCupBracketInline(teamIds);

    // Refresh transfer market
    state.transferMarket = [];
    state.transferWindowOpen = true;

    // Add season start news
    state.news.push({
      week: 0,
      text: `Season ${state.season} begins! A new chapter in the annals of Grail Ball.`,
      type: "info",
    });

    state.screen = GMScreen.DASHBOARD;
  }

  // -------------------------------------------------------------------------
  // Load game
  // -------------------------------------------------------------------------
  private _tryLoadGame(slot: number): void {
    const loaded = loadGame(slot);
    if (loaded) {
      this._state = loaded;
      this._state.screen = GMScreen.DASHBOARD;
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  destroy(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    window.removeEventListener("mousemove", _onMouseMove);
    window.removeEventListener("click", _onMouseClick);

    for (const k in _keys) _keys[k] = false;
    for (const k in _pressed) _pressed[k] = false;

    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    this._renderer.cleanup();
    viewManager.removeFromLayer("ui", this._renderer.container);
    viewManager.clearWorld();
  }
}

// ---------------------------------------------------------------------------
// Inline fixture/cup generation (to avoid import issues in next-season flow)
// ---------------------------------------------------------------------------

function generateFixturesInline(teamIds: string[]): import("./GrailManagerConfig").Fixture[] {
  const n = teamIds.length;
  const fixtures: import("./GrailManagerConfig").Fixture[] = [];
  const teams = [...teamIds];
  const rounds = n - 1;
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      fixtures.push({
        week: round + 1,
        homeTeamId: home,
        awayTeamId: away,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        events: [],
      });
      fixtures.push({
        week: round + 1 + rounds,
        homeTeamId: away,
        awayTeamId: home,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        events: [],
      });
    }
    teams.splice(1, 0, teams.pop()!);
  }
  return fixtures;
}

function generateCupBracketInline(teamIds: string[]): import("./GrailManagerConfig").CupMatch[] {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const matches: import("./GrailManagerConfig").CupMatch[] = [];
  for (let i = 0; i < 4; i++) {
    matches.push({ round: 0, roundName: "Quarter-Final", team1Id: shuffled[i * 2], team2Id: shuffled[i * 2 + 1], team1Goals: 0, team2Goals: 0, played: false, winnerId: "" });
  }
  for (let i = 0; i < 2; i++) {
    matches.push({ round: 1, roundName: "Semi-Final", team1Id: "", team2Id: "", team1Goals: 0, team2Goals: 0, played: false, winnerId: "" });
  }
  matches.push({ round: 2, roundName: "Grand Final", team1Id: "", team2Id: "", team1Goals: 0, team2Goals: 0, played: false, winnerId: "" });
  return matches;
}
