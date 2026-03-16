// ---------------------------------------------------------------------------
// Grail Ball -- Career Mode
// Season structure with league/cup competitions, team management,
// player progression, league tables, and trophy cabinet.
// ---------------------------------------------------------------------------

import {
  GB_CAREER, GB_TEAMS, GBPlayerClass,
  type GBTeamDef,
} from "./GrailBallConfig";
import {
  type GBCareerState, type GBCareerSeason, type GBLeagueEntry,
  type GBFixture, type GBPlayerProgression,
  createCareerState,
} from "./GrailBallState";

// ---------------------------------------------------------------------------
// Initialize a new career
// ---------------------------------------------------------------------------
export function initCareer(playerTeamId: string): GBCareerState {
  const career = createCareerState(playerTeamId);
  career.season = generateSeason(1, playerTeamId);
  career.roster = generateRoster(playerTeamId);
  return career;
}

// ---------------------------------------------------------------------------
// Generate a league season with fixtures
// ---------------------------------------------------------------------------
function generateSeason(year: number, _playerTeamId: string): GBCareerSeason {
  const teamIds = GB_TEAMS.map(t => t.id);

  // Create league table entries
  const leagueTable: GBLeagueEntry[] = teamIds.map(id => ({
    teamId: id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));

  // Generate round-robin fixtures (each team plays every other team twice)
  const fixtures: GBFixture[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = 0; j < teamIds.length; j++) {
      if (i === j) continue;
      fixtures.push({
        homeTeamId: teamIds[i],
        awayTeamId: teamIds[j],
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        isCup: false,
      });
    }
  }

  // Shuffle fixtures for variety
  for (let i = fixtures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fixtures[i], fixtures[j]] = [fixtures[j], fixtures[i]];
  }

  // Add cup fixtures
  const cupFixtures = generateCupFixtures(teamIds);
  fixtures.push(...cupFixtures);

  return {
    year,
    leagueTable,
    fixtures,
    currentFixture: 0,
    cupRound: 1,
    cupEliminated: false,
  };
}

// ---------------------------------------------------------------------------
// Generate cup tournament bracket
// ---------------------------------------------------------------------------
function generateCupFixtures(teamIds: string[]): GBFixture[] {
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
  const fixtures: GBFixture[] = [];

  // Quarter-finals (4 matches from 8 teams)
  for (let i = 0; i < Math.min(shuffled.length, 8); i += 2) {
    if (i + 1 < shuffled.length) {
      fixtures.push({
        homeTeamId: shuffled[i],
        awayTeamId: shuffled[i + 1],
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        isCup: true,
      });
    }
  }

  return fixtures;
}

// ---------------------------------------------------------------------------
// Generate initial roster
// ---------------------------------------------------------------------------
function generateRoster(teamId: string): GBPlayerProgression[] {
  const team = GB_TEAMS.find(t => t.id === teamId);
  if (!team) return [];

  const classes: GBPlayerClass[] = [
    GBPlayerClass.GATEKEEPER,
    GBPlayerClass.KNIGHT, GBPlayerClass.KNIGHT,
    GBPlayerClass.ROGUE, GBPlayerClass.ROGUE,
    GBPlayerClass.MAGE, GBPlayerClass.MAGE,
    // Bench players
    GBPlayerClass.KNIGHT,
    GBPlayerClass.ROGUE,
    GBPlayerClass.MAGE,
  ];

  return classes.map((cls, i) => ({
    playerId: `${teamId}_${i}`,
    name: `Player ${i + 1}`,
    cls,
    seasonGoals: 0,
    seasonAssists: 0,
    seasonTackles: 0,
    rating: 50 + Math.floor(Math.random() * 30),
    potential: 70 + Math.floor(Math.random() * 30),
    speedBonus: 0,
    tackleBonus: 0,
    magicBonus: 0,
  }));
}

// ---------------------------------------------------------------------------
// Get next fixture for the player's team
// ---------------------------------------------------------------------------
export function getNextFixture(career: GBCareerState): GBFixture | null {
  return career.season.fixtures.find(
    f => !f.played && (f.homeTeamId === career.playerTeamId || f.awayTeamId === career.playerTeamId),
  ) ?? null;
}

// ---------------------------------------------------------------------------
// Record match result into career
// ---------------------------------------------------------------------------
export function recordMatchResult(
  career: GBCareerState,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
  isCup: boolean,
): void {
  // Find and mark the fixture as played
  const fixture = career.season.fixtures.find(
    f => !f.played && f.homeTeamId === homeTeamId && f.awayTeamId === awayTeamId && f.isCup === isCup,
  );
  if (fixture) {
    fixture.played = true;
    fixture.homeGoals = homeGoals;
    fixture.awayGoals = awayGoals;
  }

  if (!isCup) {
    // Update league table
    updateLeagueTable(career.season.leagueTable, homeTeamId, awayTeamId, homeGoals, awayGoals);
  } else {
    // Cup: check if player's team was eliminated
    const playerIsHome = homeTeamId === career.playerTeamId;
    const playerIsAway = awayTeamId === career.playerTeamId;
    if (playerIsHome && homeGoals < awayGoals) career.season.cupEliminated = true;
    if (playerIsAway && awayGoals < homeGoals) career.season.cupEliminated = true;
    if (!career.season.cupEliminated) career.season.cupRound++;
  }

  // Update all-time stats for player's team
  const isPlayerHome = homeTeamId === career.playerTeamId;
  const isPlayerAway = awayTeamId === career.playerTeamId;
  if (isPlayerHome || isPlayerAway) {
    const playerGoals = isPlayerHome ? homeGoals : awayGoals;
    const opponentGoals = isPlayerHome ? awayGoals : homeGoals;

    career.allTimeStats.totalGoalsFor += playerGoals;
    career.allTimeStats.totalGoalsAgainst += opponentGoals;

    if (playerGoals > opponentGoals) career.allTimeStats.totalWins++;
    else if (playerGoals < opponentGoals) career.allTimeStats.totalLosses++;
    else career.allTimeStats.totalDraws++;
  }

  career.season.currentFixture++;
}

// ---------------------------------------------------------------------------
// Simulate AI match (when player is not involved)
// ---------------------------------------------------------------------------
export function simulateAIMatch(homeTeamId: string, awayTeamId: string): { homeGoals: number; awayGoals: number } {
  const homeTeam = GB_TEAMS.find(t => t.id === homeTeamId);
  const awayTeam = GB_TEAMS.find(t => t.id === awayTeamId);

  // Simple simulation based on team stats
  const homeStrength = homeTeam ? (homeTeam.speedMod + homeTeam.tackleMod + homeTeam.magicMod) / 3 + 0.05 : 1; // home advantage
  const awayStrength = awayTeam ? (awayTeam.speedMod + awayTeam.tackleMod + awayTeam.magicMod) / 3 : 1;

  const homeExpected = 1.5 * homeStrength;
  const awayExpected = 1.2 * awayStrength;

  const homeGoals = poissonRandom(homeExpected);
  const awayGoals = poissonRandom(awayExpected);

  return { homeGoals, awayGoals };
}

function poissonRandom(lambda: number): number {
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------------------
// Update league table
// ---------------------------------------------------------------------------
function updateLeagueTable(
  table: GBLeagueEntry[],
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
): void {
  const homeEntry = table.find(e => e.teamId === homeTeamId);
  const awayEntry = table.find(e => e.teamId === awayTeamId);

  if (homeEntry) {
    homeEntry.played++;
    homeEntry.goalsFor += homeGoals;
    homeEntry.goalsAgainst += awayGoals;
    if (homeGoals > awayGoals) { homeEntry.won++; homeEntry.points += GB_CAREER.WIN_POINTS; }
    else if (homeGoals === awayGoals) { homeEntry.drawn++; homeEntry.points += GB_CAREER.DRAW_POINTS; }
    else { homeEntry.lost++; }
  }

  if (awayEntry) {
    awayEntry.played++;
    awayEntry.goalsFor += awayGoals;
    awayEntry.goalsAgainst += homeGoals;
    if (awayGoals > homeGoals) { awayEntry.won++; awayEntry.points += GB_CAREER.WIN_POINTS; }
    else if (homeGoals === awayGoals) { awayEntry.drawn++; awayEntry.points += GB_CAREER.DRAW_POINTS; }
    else { awayEntry.lost++; }
  }
}

// ---------------------------------------------------------------------------
// Simulate remaining fixtures (advance season)
// ---------------------------------------------------------------------------
export function simulateRemainingFixtures(career: GBCareerState): void {
  for (const fixture of career.season.fixtures) {
    if (fixture.played) continue;
    if (fixture.homeTeamId === career.playerTeamId || fixture.awayTeamId === career.playerTeamId) continue;

    const result = simulateAIMatch(fixture.homeTeamId, fixture.awayTeamId);
    fixture.played = true;
    fixture.homeGoals = result.homeGoals;
    fixture.awayGoals = result.awayGoals;

    if (!fixture.isCup) {
      updateLeagueTable(career.season.leagueTable, fixture.homeTeamId, fixture.awayTeamId, result.homeGoals, result.awayGoals);
    }
  }
}

// ---------------------------------------------------------------------------
// Get sorted league table
// ---------------------------------------------------------------------------
export function getSortedLeagueTable(career: GBCareerState): GBLeagueEntry[] {
  return [...career.season.leagueTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// ---------------------------------------------------------------------------
// End season: check awards, generate next season
// ---------------------------------------------------------------------------
export function endSeason(career: GBCareerState): {
  leagueWinner: string;
  cupWinner: string | null;
  playerLeaguePosition: number;
} {
  // Simulate any remaining AI vs AI fixtures
  simulateRemainingFixtures(career);

  const sorted = getSortedLeagueTable(career);
  const leagueWinner = sorted[0]?.teamId ?? career.playerTeamId;
  const playerLeaguePosition = sorted.findIndex(e => e.teamId === career.playerTeamId) + 1;

  if (leagueWinner === career.playerTeamId) {
    career.trophies.push({ type: "league", year: career.season.year });
  }

  // Cup winner (simplified)
  let cupWinner: string | null = null;
  if (!career.season.cupEliminated && career.season.cupRound > GB_CAREER.CUP_ROUNDS) {
    cupWinner = career.playerTeamId;
    career.trophies.push({ type: "cup", year: career.season.year });
  }

  career.allTimeStats.seasonsPlayed++;

  // Progress players
  for (const p of career.roster) {
    if (p.rating < p.potential) {
      p.rating = Math.min(p.potential, p.rating + Math.floor(Math.random() * 5) + 1);
    }
    p.seasonGoals = 0;
    p.seasonAssists = 0;
    p.seasonTackles = 0;
  }

  // Generate next season
  career.season = generateSeason(career.season.year + 1, career.playerTeamId);
  career.transferBudget += GB_CAREER.TRANSFER_BUDGET_BASE * 0.5;
  career.subsUsed = 0;

  return { leagueWinner, cupWinner, playerLeaguePosition };
}

// ---------------------------------------------------------------------------
// Training: boost a player's stats
// ---------------------------------------------------------------------------
export function trainPlayer(
  career: GBCareerState,
  playerId: string,
  stat: "speed" | "tackle" | "magic",
): boolean {
  const player = career.roster.find(p => p.playerId === playerId);
  if (!player) return false;

  switch (stat) {
    case "speed":
      player.speedBonus += GB_CAREER.TRAINING_BOOST_SPEED;
      break;
    case "tackle":
      player.tackleBonus += GB_CAREER.TRAINING_BOOST_TACKLE;
      break;
    case "magic":
      player.magicBonus += GB_CAREER.TRAINING_BOOST_MAGIC;
      break;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Transfer: buy a new player
// ---------------------------------------------------------------------------
export function buyPlayer(
  career: GBCareerState,
  name: string,
  cls: GBPlayerClass,
  rating: number,
): boolean {
  const cost = rating > 70 ? GB_CAREER.PLAYER_COST_STAR : GB_CAREER.PLAYER_COST_BASE;
  if (career.transferBudget < cost) return false;

  career.transferBudget -= cost;
  career.roster.push({
    playerId: `transfer_${Date.now()}_${Math.random()}`,
    name,
    cls,
    seasonGoals: 0,
    seasonAssists: 0,
    seasonTackles: 0,
    rating,
    potential: rating + Math.floor(Math.random() * 15),
    speedBonus: 0,
    tackleBonus: 0,
    magicBonus: 0,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Get team definition by id
// ---------------------------------------------------------------------------
export function getTeamDef(teamId: string): GBTeamDef | undefined {
  return GB_TEAMS.find(t => t.id === teamId);
}
