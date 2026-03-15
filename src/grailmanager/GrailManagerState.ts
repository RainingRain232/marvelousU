// ---------------------------------------------------------------------------
// Grail Ball Manager — Game State
// Complete state for club, squad, league, cup, calendar, finances, and save/load.
// ---------------------------------------------------------------------------

import {
  PlayerClass, Formation, TeamInstruction, FacilityType, Weather, Injury,
  TrainingType, PlayerDef, TeamDef, TEAM_DEFS, GBM,
  generateSquad, generateFixtures, generateCupBracket, generateSeasonConfig,
  generatePlayer, generatePlayerId,
} from "./GrailManagerConfig";
import type { Fixture, CupMatch, SeasonConfig } from "./GrailManagerConfig";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum GMScreen {
  DASHBOARD = "dashboard",
  SQUAD = "squad",
  TACTICS = "tactics",
  MATCH = "match",
  TRANSFERS = "transfers",
  FACILITIES = "facilities",
  LEAGUE = "league",
  CUP = "cup",
  CALENDAR = "calendar",
  RULES = "rules",
  MAIN_MENU = "main_menu",
  NEW_GAME_SETUP = "new_game_setup",
  PLAYER_DETAIL = "player_detail",
  MATCH_RESULT = "match_result",
  SEASON_END = "season_end",
  SAVE_LOAD = "save_load",
}

export enum MatchPhase {
  NOT_STARTED = "not_started",
  FIRST_HALF = "first_half",
  HALF_TIME = "half_time",
  SECOND_HALF = "second_half",
  FULL_TIME = "full_time",
}

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export interface LeagueEntry {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string[]; // last 5 results: "W"/"D"/"L"
}

export interface TransferListing {
  player: PlayerDef;
  fromTeamId: string;
  askingPrice: number;
  daysListed: number;
}

export interface TransferOffer {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  fee: number;
  wagePct: number;
  status: "pending" | "accepted" | "rejected" | "negotiating";
}

export interface FacilityConstruction {
  type: FacilityType;
  targetLevel: number;
  weeksRemaining: number;
}

export interface MatchCommentary {
  minute: number;
  text: string;
  type: "goal" | "save" | "tackle" | "foul" | "injury" | "substitution" |
        "chance" | "spell" | "halftime" | "fulltime" | "kickoff" | "possession" |
        "penalty" | "redCard" | "info";
  isHome: boolean;
}

export interface LiveMatchState {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  minute: number;
  phase: MatchPhase;
  commentary: MatchCommentary[];
  homePossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  weather: Weather;
  speed: number;
  homeLineup: string[];     // player IDs in starting 7
  awayLineup: string[];
  homeSubs: string[];        // available sub IDs
  awaySubs: string[];
  homeSubsMade: number;
  awaySubsMade: number;
  homeRatings: Record<string, number>;
  awayRatings: Record<string, number>;
  // For pitch visualization
  playerPositions: Record<string, { x: number; y: number; hasOrb: boolean }>;
  orbX: number;
  orbY: number;
  isUserHome: boolean;
  homeFormation: Formation;
  awayFormation: Formation;
  simulationComplete: boolean;
  eventsThisMinute: MatchCommentary[];
}

export interface NewsItem {
  week: number;
  text: string;
  type: "info" | "transfer" | "injury" | "match" | "facility" | "youth" | "achievement";
}

export interface TeamState {
  teamDef: TeamDef;
  squad: PlayerDef[];
  formation: Formation;
  instruction: TeamInstruction;
  startingLineup: string[];   // player IDs for starting 7
  substitutes: string[];      // player IDs for subs bench (3)
  trainingType: TrainingType;
}

// ---------------------------------------------------------------------------
// Main Game State
// ---------------------------------------------------------------------------

export interface GrailManagerState {
  // Meta
  screen: GMScreen;
  prevScreen: GMScreen;
  season: number;
  currentWeek: number;
  gameStarted: boolean;

  // Player's club
  playerTeamId: string;
  playerClubName: string;
  managerName: string;

  // All teams
  teams: Record<string, TeamState>;

  // League
  leagueTable: LeagueEntry[];
  fixtures: Fixture[];

  // Cup
  cupMatches: CupMatch[];
  playerCupEliminated: boolean;

  // Calendar
  seasonConfig: SeasonConfig;

  // Transfers
  transferMarket: TransferListing[];
  pendingOffers: TransferOffer[];
  transferWindowOpen: boolean;

  // Finances (player team)
  gold: number;
  weeklyIncome: number;
  weeklyExpenses: number;
  seasonRevenue: number;
  seasonExpenses: number;

  // Facilities (player team)
  facilities: Record<FacilityType, number>;
  constructions: FacilityConstruction[];

  // Match
  liveMatch: LiveMatchState | null;
  lastMatchResult: { home: string; away: string; homeGoals: number; awayGoals: number; commentary: MatchCommentary[] } | null;

  // News
  news: NewsItem[];

  // UI state
  selectedPlayerId: string | null;
  selectedTabIndex: number;
  scrollOffset: number;
  matchSpeed: number;
  confirmDialog: { message: string; onConfirm: (() => void) | null; onCancel: (() => void) | null } | null;

  // Manager stats
  managerWins: number;
  managerDraws: number;
  managerLosses: number;
  managerReputation: number;
  trophies: string[];

  // Save
  saveSlot: number;
}

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createGrailManagerState(): GrailManagerState {
  return {
    screen: GMScreen.MAIN_MENU,
    prevScreen: GMScreen.MAIN_MENU,
    season: 1,
    currentWeek: 0,
    gameStarted: false,

    playerTeamId: "",
    playerClubName: "",
    managerName: "Sir Manager",

    teams: {},

    leagueTable: [],
    fixtures: [],

    cupMatches: [],
    playerCupEliminated: false,

    seasonConfig: generateSeasonConfig(),

    transferMarket: [],
    pendingOffers: [],
    transferWindowOpen: true,

    gold: 0,
    weeklyIncome: 0,
    weeklyExpenses: 0,
    seasonRevenue: 0,
    seasonExpenses: 0,

    facilities: {
      [FacilityType.TRAINING_GROUND]: 1,
      [FacilityType.STADIUM]: 1,
      [FacilityType.MEDICAL_BAY]: 1,
      [FacilityType.YOUTH_ACADEMY]: 0,
      [FacilityType.SCOUTING_NETWORK]: 0,
      [FacilityType.ALCHEMY_LAB]: 0,
    },
    constructions: [],

    liveMatch: null,
    lastMatchResult: null,

    news: [],

    selectedPlayerId: null,
    selectedTabIndex: 0,
    scrollOffset: 0,
    matchSpeed: 1,
    confirmDialog: null,

    managerWins: 0,
    managerDraws: 0,
    managerLosses: 0,
    managerReputation: 50,
    trophies: [],

    saveSlot: 0,
  };
}

// ---------------------------------------------------------------------------
// Initialize a new game with a chosen team
// ---------------------------------------------------------------------------

export function initNewGame(state: GrailManagerState, teamId: string, managerName: string): void {
  state.playerTeamId = teamId;
  state.managerName = managerName || "Sir Manager";
  state.gameStarted = true;
  state.currentWeek = 0;
  state.season = 1;

  // Generate all teams and squads
  const teamIds: string[] = [];
  for (const def of TEAM_DEFS) {
    const squad = generateSquad(def.reputation, 18);
    const starters = pickBestLineup(squad, def.formation);

    state.teams[def.id] = {
      teamDef: def,
      squad,
      formation: def.formation,
      instruction: def.style,
      startingLineup: starters.lineup.map(p => p.id),
      substitutes: starters.subs.map(p => p.id),
      trainingType: TrainingType.TEAMWORK,
    };
    teamIds.push(def.id);

    if (def.id === teamId) {
      state.playerClubName = def.name;
      state.gold = def.budget;
      state.facilities = { ...def.facilities };
    }
  }

  // Generate league table
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

  // Generate fixtures
  state.fixtures = generateFixtures(teamIds);

  // Generate cup bracket
  state.cupMatches = generateCupBracket(teamIds);

  // Generate initial transfer market
  refreshTransferMarket(state);

  // Starting news
  state.news = [
    { week: 0, text: `Welcome, ${state.managerName}! You have been appointed manager of ${state.playerClubName}.`, type: "info" },
    { week: 0, text: "The new Grail Ball season begins! May glory and honour await.", type: "info" },
    { week: 0, text: "The transfer window is OPEN — strengthen your squad before it closes!", type: "transfer" },
  ];

  // Calculate initial finances
  recalcFinances(state);

  state.screen = GMScreen.DASHBOARD;
}

// ---------------------------------------------------------------------------
// Auto-pick best lineup from squad
// ---------------------------------------------------------------------------

export function pickBestLineup(squad: PlayerDef[], formation: Formation): { lineup: PlayerDef[]; subs: PlayerDef[] } {
  // Parse formation: e.g., "2-2-2" -> [2 Knights, 2 Rogues, 2 Mages] + 1 GK
  const parts = formation.split("-").map(Number);
  const needed: { cls: PlayerClass; count: number }[] = [
    { cls: PlayerClass.GATEKEEPER, count: 1 },
    { cls: PlayerClass.KNIGHT, count: parts[0] },
    { cls: PlayerClass.ROGUE, count: parts[1] },
    { cls: PlayerClass.MAGE, count: parts[2] },
  ];

  const available = squad.filter(p => p.injury === Injury.NONE && p.injuryWeeks === 0);
  const selected: PlayerDef[] = [];
  const used = new Set<string>();

  for (const { cls, count } of needed) {
    const candidates = available
      .filter(p => p.class === cls && !used.has(p.id))
      .sort((a, b) => getOverall(b) - getOverall(a));
    for (let i = 0; i < count && i < candidates.length; i++) {
      selected.push(candidates[i]);
      used.add(candidates[i].id);
    }
  }

  // If we don't have enough of a class, fill with best available from other classes
  while (selected.length < 7) {
    const candidate = available.find(p => !used.has(p.id));
    if (!candidate) break;
    selected.push(candidate);
    used.add(candidate.id);
  }

  // Subs: next 3 best available
  const subs = available
    .filter(p => !used.has(p.id))
    .sort((a, b) => getOverall(b) - getOverall(a))
    .slice(0, 3);

  return { lineup: selected, subs };
}

// ---------------------------------------------------------------------------
// Helper: overall rating
// ---------------------------------------------------------------------------

export function getOverall(p: PlayerDef): number {
  const s = p.stats;
  switch (p.class) {
    case PlayerClass.GATEKEEPER:
      return Math.round(s.defense * 0.4 + s.speed * 0.15 + s.stamina * 0.2 + s.morale * 0.1 + s.attack * 0.05 + s.magic * 0.1);
    case PlayerClass.KNIGHT:
      return Math.round(s.defense * 0.35 + s.attack * 0.15 + s.speed * 0.15 + s.stamina * 0.2 + s.morale * 0.1 + s.magic * 0.05);
    case PlayerClass.ROGUE:
      return Math.round(s.speed * 0.3 + s.attack * 0.2 + s.defense * 0.1 + s.stamina * 0.15 + s.morale * 0.1 + s.magic * 0.15);
    case PlayerClass.MAGE:
      return Math.round(s.magic * 0.35 + s.attack * 0.25 + s.speed * 0.15 + s.stamina * 0.1 + s.morale * 0.1 + s.defense * 0.05);
  }
}

export function getPlayerFullName(p: PlayerDef): string {
  return `${p.firstName} ${p.lastName}`;
}

// ---------------------------------------------------------------------------
// Financial calculations
// ---------------------------------------------------------------------------

export function recalcFinances(state: GrailManagerState): void {
  const team = state.teams[state.playerTeamId];
  if (!team) return;

  const stadLevel = state.facilities[FacilityType.STADIUM];
  const baseCapacity = team.teamDef.stadiumCapacity + stadLevel * 2000;
  const ticketRevenue = Math.round(baseCapacity * 0.6 * GBM.TICKET_PRICE_BASE);
  const sponsorship = Math.round(GBM.SPONSORSHIP_BASE * (1 + state.managerReputation * 0.01));

  state.weeklyIncome = Math.round((ticketRevenue + sponsorship) / 14); // spread across match weeks
  state.weeklyExpenses = team.squad.reduce((sum, p) => sum + p.wage, 0);
}

// ---------------------------------------------------------------------------
// Transfer market refresh
// ---------------------------------------------------------------------------

export function refreshTransferMarket(state: GrailManagerState): void {
  state.transferMarket = [];
  const allClasses = [PlayerClass.GATEKEEPER, PlayerClass.KNIGHT, PlayerClass.ROGUE, PlayerClass.MAGE];

  // Generate 12-20 random players for sale
  const count = 12 + Math.floor(Math.random() * 9);
  for (let i = 0; i < count; i++) {
    const cls = allClasses[Math.floor(Math.random() * allClasses.length)];
    const quality = 0.6 + Math.random() * 0.8;
    const player = generatePlayer(cls, quality);
    const askingPrice = Math.round(player.value * (1 + Math.random() * 0.3));

    state.transferMarket.push({
      player,
      fromTeamId: "free_agent",
      askingPrice,
      daysListed: 0,
    });
  }

  // Also list some players from AI teams wanting to sell
  for (const [tid, ts] of Object.entries(state.teams)) {
    if (tid === state.playerTeamId) continue;
    // Each AI team may list 0-2 players
    const listCount = Math.floor(Math.random() * 3);
    const candidates = [...ts.squad]
      .filter(p => !ts.startingLineup.includes(p.id))
      .sort((a, b) => getOverall(a) - getOverall(b));
    for (let i = 0; i < listCount && i < candidates.length; i++) {
      const p = candidates[i];
      state.transferMarket.push({
        player: p,
        fromTeamId: tid,
        askingPrice: Math.round(p.value * (1.1 + Math.random() * 0.4)),
        daysListed: 0,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Advance week
// ---------------------------------------------------------------------------

export function advanceWeek(state: GrailManagerState): {
  leagueFixtures: Fixture[];
  cupMatch: CupMatch | null;
  events: string[];
} {
  state.currentWeek++;
  const week = state.currentWeek;
  const events: string[] = [];

  // Transfer window check
  const sc = state.seasonConfig;
  state.transferWindowOpen = week >= sc.transferWindowStart && week <= sc.transferWindowEnd;

  // Process training for all teams
  for (const [tid, ts] of Object.entries(state.teams)) {
    applyTraining(ts, state.facilities, tid === state.playerTeamId);
  }

  // Process injuries healing
  for (const ts of Object.values(state.teams)) {
    for (const p of ts.squad) {
      if (p.injuryWeeks > 0) {
        p.injuryWeeks--;
        if (p.injuryWeeks === 0) {
          p.injury = Injury.NONE;
          events.push(`${p.firstName} ${p.lastName} has recovered from ${p.injury}!`);
        }
      }
    }
  }

  // Process facility construction
  for (let i = state.constructions.length - 1; i >= 0; i--) {
    state.constructions[i].weeksRemaining--;
    if (state.constructions[i].weeksRemaining <= 0) {
      const c = state.constructions[i];
      state.facilities[c.type] = c.targetLevel;
      events.push(`${c.type} upgraded to level ${c.targetLevel}!`);
      state.news.push({ week, text: `Facility upgrade complete: ${c.type} is now level ${c.targetLevel}!`, type: "facility" });
      state.constructions.splice(i, 1);
    }
  }

  // Youth academy spawn
  const youthLevel = state.facilities[FacilityType.YOUTH_ACADEMY];
  if (youthLevel > 0 && Math.random() < GBM.YOUTH_SPAWN_CHANCE * youthLevel) {
    const team = state.teams[state.playerTeamId];
    if (team && team.squad.length < GBM.SQUAD_MAX) {
      const classes = [PlayerClass.KNIGHT, PlayerClass.ROGUE, PlayerClass.MAGE, PlayerClass.GATEKEEPER];
      const cls = classes[Math.floor(Math.random() * classes.length)];
      const quality = 0.5 + youthLevel * 0.15;
      const youth = generatePlayer(cls, quality, undefined, true);
      youth.wage = Math.round(youth.wage * GBM.YOUTH_WAGE_MULT);
      team.squad.push(youth);
      events.push(`Youth academy produces: ${youth.firstName} ${youth.lastName} (${youth.class})`);
      state.news.push({ week, text: `A promising young ${youth.class} has graduated from the academy: ${youth.firstName} ${youth.lastName}!`, type: "youth" });
    }
  }

  // Weekly finances
  const playerTeam = state.teams[state.playerTeamId];
  if (playerTeam) {
    recalcFinances(state);
    // Only add income on match weeks
    const hasMatch = state.fixtures.some(f => f.week === week && !f.played &&
      (f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId));
    if (hasMatch) {
      state.gold += state.weeklyIncome;
      state.seasonRevenue += state.weeklyIncome;
    }
    state.gold -= state.weeklyExpenses;
    state.seasonExpenses += state.weeklyExpenses;
  }

  // Age progression at season milestones
  if (week === 15) {
    for (const ts of Object.values(state.teams)) {
      for (const p of ts.squad) {
        // Natural stat growth/decline based on age
        if (p.age < GBM.AGE_GROWTH_PEAK) {
          const growth = p.isYouth ? GBM.YOUTH_GROWTH_MULT : 1.0;
          for (const stat of Object.keys(p.stats) as (keyof typeof p.stats)[]) {
            if (stat === "morale") continue;
            if (Math.random() < 0.3 * growth) {
              (p.stats as any)[stat] = Math.min(99, p.stats[stat] + 1);
            }
          }
        } else if (p.age >= GBM.AGE_DECLINE_START) {
          for (const stat of Object.keys(p.stats) as (keyof typeof p.stats)[]) {
            if (stat === "morale") continue;
            if (Math.random() < 0.2) {
              (p.stats as any)[stat] = Math.max(1, p.stats[stat] - 1);
            }
          }
        }
      }
    }
  }

  // Get fixtures for this week
  const leagueFixtures = state.fixtures.filter(f => f.week === week && !f.played);

  // Check for cup match this week
  let cupMatch: CupMatch | null = null;
  for (const cr of sc.cupRounds) {
    if (cr.week === week) {
      // Find next unplayed cup match at current round
      cupMatch = state.cupMatches.find(m => !m.played && m.team1Id && m.team2Id) || null;
      break;
    }
  }

  // AI transfer activity
  if (state.transferWindowOpen && Math.random() < 0.3) {
    // Random AI team makes a transfer
    const aiTeamIds = Object.keys(state.teams).filter(id => id !== state.playerTeamId);
    const aiTeamId = aiTeamIds[Math.floor(Math.random() * aiTeamIds.length)];
    const aiTeam = state.teams[aiTeamId];
    if (aiTeam && aiTeam.squad.length < GBM.SQUAD_MAX && state.transferMarket.length > 0) {
      const listing = state.transferMarket[Math.floor(Math.random() * state.transferMarket.length)];
      if (listing.fromTeamId !== aiTeamId) {
        // AI buys the player
        aiTeam.squad.push({ ...listing.player, id: generatePlayerId() });
        state.transferMarket = state.transferMarket.filter(l => l !== listing);
        state.news.push({
          week,
          text: `${state.teams[aiTeamId].teamDef.name} signs ${listing.player.firstName} ${listing.player.lastName} for ${listing.askingPrice}g!`,
          type: "transfer",
        });
      }
    }
  }

  // Morale drift
  for (const ts of Object.values(state.teams)) {
    for (const p of ts.squad) {
      // Drift toward 60
      if (p.stats.morale < 60 && Math.random() < 0.3) p.stats.morale++;
      if (p.stats.morale > 60 && Math.random() < 0.2) p.stats.morale--;
    }
  }

  // Check season end
  const allPlayed = state.fixtures.every(f => f.played);
  const allCupPlayed = state.cupMatches.filter(m => m.round === 2).every(m => m.played);
  if (allPlayed && allCupPlayed && week >= sc.totalWeeks) {
    events.push("SEASON_END");
  }

  return { leagueFixtures, cupMatch, events };
}

// ---------------------------------------------------------------------------
// Apply training to a team
// ---------------------------------------------------------------------------

function applyTraining(team: TeamState, facilities: Record<FacilityType, number>, isPlayer: boolean): void {
  const trainingLevel = isPlayer ? facilities[FacilityType.TRAINING_GROUND] : Math.floor(Math.random() * 3) + 1;
  const mult = 1 + trainingLevel * 0.1;
  const effects = {
    [TrainingType.FITNESS]:   { stamina: 0.5, speed: 0.15 },
    [TrainingType.ATTACKING]: { attack: 0.5, magic: 0.1 },
    [TrainingType.DEFENDING]: { defense: 0.5, stamina: 0.1 },
    [TrainingType.SPEED]:     { speed: 0.5, attack: 0.1 },
    [TrainingType.SPELLWORK]: { magic: 0.6, attack: 0.15 },
    [TrainingType.TEAMWORK]:  { morale: 1.0 },
    [TrainingType.REST]:      {},
  };

  const boosts = effects[team.trainingType] || {};

  for (const p of team.squad) {
    if (p.injury !== Injury.NONE) continue;

    for (const [stat, val] of Object.entries(boosts)) {
      if (Math.random() < (val as number) * mult * GBM.TRAINING_STAT_GAIN_BASE) {
        const s = p.stats as any;
        const ceiling = Math.min(99, p.potential);
        if (s[stat] < ceiling) {
          s[stat] = Math.min(ceiling, s[stat] + 1);
        }
      }
    }

    // Rest heals morale
    if (team.trainingType === TrainingType.REST) {
      p.stats.morale = Math.min(99, p.stats.morale + 2);
    }

    // Injury risk from training
    if (team.trainingType !== TrainingType.REST && Math.random() < 0.005) {
      p.injury = Injury.MINOR_BRUISE;
      p.injuryWeeks = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Update league table after a match result
// ---------------------------------------------------------------------------

export function updateLeagueTable(state: GrailManagerState, fixture: Fixture): void {
  const homeEntry = state.leagueTable.find(e => e.teamId === fixture.homeTeamId)!;
  const awayEntry = state.leagueTable.find(e => e.teamId === fixture.awayTeamId)!;

  homeEntry.played++;
  awayEntry.played++;
  homeEntry.goalsFor += fixture.homeGoals;
  homeEntry.goalsAgainst += fixture.awayGoals;
  awayEntry.goalsFor += fixture.awayGoals;
  awayEntry.goalsAgainst += fixture.homeGoals;

  if (fixture.homeGoals > fixture.awayGoals) {
    homeEntry.won++;
    homeEntry.points += 3;
    awayEntry.lost++;
    homeEntry.form.push("W");
    awayEntry.form.push("L");
  } else if (fixture.homeGoals < fixture.awayGoals) {
    awayEntry.won++;
    awayEntry.points += 3;
    homeEntry.lost++;
    homeEntry.form.push("L");
    awayEntry.form.push("W");
  } else {
    homeEntry.drawn++;
    awayEntry.drawn++;
    homeEntry.points += 1;
    awayEntry.points += 1;
    homeEntry.form.push("D");
    awayEntry.form.push("D");
  }

  // Keep last 5
  if (homeEntry.form.length > 5) homeEntry.form.shift();
  if (awayEntry.form.length > 5) awayEntry.form.shift();

  // Sort table
  state.leagueTable.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// ---------------------------------------------------------------------------
// Update morale after match
// ---------------------------------------------------------------------------

export function updateMoraleAfterMatch(team: TeamState, won: boolean, drew: boolean): void {
  for (const p of team.squad) {
    if (won) {
      p.stats.morale = Math.min(99, p.stats.morale + GBM.MORALE_WIN_BOOST);
      p.form = Math.min(3, p.form + 1);
    } else if (drew) {
      p.stats.morale = Math.min(99, Math.max(1, p.stats.morale + GBM.MORALE_DRAW_CHANGE));
    } else {
      p.stats.morale = Math.max(1, p.stats.morale - GBM.MORALE_LOSS_DROP);
      p.form = Math.max(-3, p.form - 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Advance cup bracket
// ---------------------------------------------------------------------------

export function advanceCupBracket(state: GrailManagerState): void {
  // Check if all matches of current round are done
  for (let round = 0; round < 2; round++) {
    const roundMatches = state.cupMatches.filter(m => m.round === round);
    if (roundMatches.every(m => m.played)) {
      const nextRound = state.cupMatches.filter(m => m.round === round + 1 && !m.team1Id);
      const winners = roundMatches.map(m => m.winnerId).filter(Boolean);
      for (let i = 0; i < nextRound.length; i++) {
        if (winners[i * 2]) nextRound[i].team1Id = winners[i * 2];
        if (winners[i * 2 + 1]) nextRound[i].team2Id = winners[i * 2 + 1];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Save / Load
// ---------------------------------------------------------------------------

const SAVE_KEY = "grail_ball_manager_save";

export function saveGame(state: GrailManagerState, slot: number): boolean {
  try {
    const key = `${SAVE_KEY}_${slot}`;
    // Strip non-serializable fields
    const saveData = {
      ...state,
      confirmDialog: null,
      liveMatch: null,
    };
    localStorage.setItem(key, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
}

export function loadGame(slot: number): GrailManagerState | null {
  try {
    const key = `${SAVE_KEY}_${slot}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    const data = JSON.parse(json) as GrailManagerState;
    data.confirmDialog = null;
    data.liveMatch = null;
    return data;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

export function hasSave(slot: number): boolean {
  return !!localStorage.getItem(`${SAVE_KEY}_${slot}`);
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(`${SAVE_KEY}_${slot}`);
}
