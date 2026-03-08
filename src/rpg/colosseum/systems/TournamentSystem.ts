// Tournament bracket — generates 8-team elimination, resolves AI matches
import { SeededRandom } from "@sim/utils/random";
import type { UnitType } from "@/types";
import { createPartyMember } from "@rpg/systems/PartyFactory";
import type { PartyMember } from "@rpg/state/RPGState";
import type { ColosseumTeam, TournamentState, TournamentMatch, ColosseumRuleset } from "../state/ColosseumState";
import { AI_TEAM_NAMES, ARENA_UNIT_POOLS } from "../config/ColosseumDefs";
import { runColosseumAutoBattle, createBattleFromTeams } from "./ColosseumBattleSystem";

// ---------------------------------------------------------------------------
// Power level
// ---------------------------------------------------------------------------

export function calculatePowerLevel(team: ColosseumTeam): number {
  let total = 0;
  for (const m of team.members) {
    total += m.maxHp + m.atk * 3 + m.def * 2 + m.speed;
  }
  return total;
}

// ---------------------------------------------------------------------------
// AI team generation
// ---------------------------------------------------------------------------

export function generateAITeam(
  teamId: string,
  avgLevel: number,
  teamSize: number,
  seed: number,
): ColosseumTeam {
  const rng = new SeededRandom(seed);
  const name = rng.pick(AI_TEAM_NAMES);

  const members: PartyMember[] = [];
  const formation: Record<string, 1 | 2> = {};

  // Team composition: ~50% melee, ~25% ranged, ~25% mage/healer
  const allPools = ARENA_UNIT_POOLS;
  for (let i = 0; i < teamSize; i++) {
    let pool: UnitType[];
    if (i === 0) pool = allPools.melee;
    else if (i === teamSize - 1 && teamSize >= 3) pool = allPools.healer;
    else if (i % 2 === 0) pool = allPools.ranged;
    else pool = rng.next() < 0.5 ? allPools.melee : allPools.mage;

    const unitType = rng.pick(pool);
    const level = Math.max(1, Math.min(30, avgLevel + Math.floor(rng.next() * 5 - 2)));
    const memberId = `${teamId}_${i}`;
    const member = createPartyMember(memberId, `${name} ${_romanNumeral(i + 1)}`, unitType, level);
    members.push(member);

    // Front line for melee, back for ranged/mage
    const unitDef = { range: member.range };
    formation[memberId] = unitDef.range <= 1 ? 1 : 2;
  }

  const team: ColosseumTeam = { id: teamId, name, members, formation, powerLevel: 0, isPlayer: false };
  team.powerLevel = calculatePowerLevel(team);
  return team;
}

function _romanNumeral(n: number): string {
  const numerals = ["I", "II", "III", "IV", "V", "VI"];
  return numerals[n - 1] ?? `${n}`;
}

// ---------------------------------------------------------------------------
// Odds
// ---------------------------------------------------------------------------

export function calculateOdds(team1: ColosseumTeam, team2: ColosseumTeam): { team1Odds: number; team2Odds: number } {
  const p1 = Math.max(1, team1.powerLevel);
  const p2 = Math.max(1, team2.powerLevel);
  const total = p1 + p2;
  return {
    team1Odds: Math.max(1.1, +((total / p1).toFixed(2))),
    team2Odds: Math.max(1.1, +((total / p2).toFixed(2))),
  };
}

// ---------------------------------------------------------------------------
// Tournament generation
// ---------------------------------------------------------------------------

export function generateTournament(
  playerTeam: ColosseumTeam,
  seed: number,
  ruleset: ColosseumRuleset,
): TournamentState {
  const rng = new SeededRandom(seed);
  const avgLevel = playerTeam.members.length > 0
    ? Math.round(playerTeam.members.reduce((s, m) => s + m.level, 0) / playerTeam.members.length)
    : 5;

  // Generate 7 AI teams
  const teams: ColosseumTeam[] = [playerTeam];
  const usedNames = new Set<string>([playerTeam.name]);

  for (let i = 0; i < 7; i++) {
    let team: ColosseumTeam;
    do {
      team = generateAITeam(`ai_${i}`, avgLevel, ruleset.singleUnit ? 1 : ruleset.teamSize, seed + i * 1000 + Math.floor(rng.next() * 9999));
    } while (usedNames.has(team.name));
    usedNames.add(team.name);
    teams.push(team);
  }

  // Shuffle teams for random bracket placement (but player stays in)
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Generate bracket: 4 quarterfinal matches → 2 semifinal → 1 final
  const matches: TournamentMatch[] = [];

  // Quarterfinals (round 0)
  for (let i = 0; i < 4; i++) {
    const t1 = shuffled[i * 2];
    const t2 = shuffled[i * 2 + 1];
    const odds = calculateOdds(t1, t2);
    matches.push({
      id: `qf_${i}`,
      round: 0,
      matchIndex: i,
      team1Id: t1.id,
      team2Id: t2.id,
      winnerId: null,
      team1Odds: odds.team1Odds,
      team2Odds: odds.team2Odds,
      playerBet: null,
    });
  }

  // Semifinal placeholders (round 1)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `sf_${i}`,
      round: 1,
      matchIndex: i,
      team1Id: "",
      team2Id: "",
      winnerId: null,
      team1Odds: 1,
      team2Odds: 1,
      playerBet: null,
    });
  }

  // Final placeholder (round 2)
  matches.push({
    id: "final",
    round: 2,
    matchIndex: 0,
    team1Id: "",
    team2Id: "",
    winnerId: null,
    team1Odds: 1,
    team2Odds: 1,
    playerBet: null,
  });

  return {
    teams: shuffled,
    matches,
    currentRound: 0,
    currentMatchIndex: 0,
    isComplete: false,
  };
}

// ---------------------------------------------------------------------------
// Bracket advancement
// ---------------------------------------------------------------------------

export function advanceBracket(tournament: TournamentState, matchId: string, winnerId: string): void {
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) return;
  match.winnerId = winnerId;

  // Fill next round's match slots
  if (match.round === 0) {
    // QF → SF: match 0,1 feed into SF 0; match 2,3 feed into SF 1
    const sfIndex = Math.floor(match.matchIndex / 2);
    const sfMatch = tournament.matches.find(m => m.round === 1 && m.matchIndex === sfIndex);
    if (sfMatch) {
      if (match.matchIndex % 2 === 0) sfMatch.team1Id = winnerId;
      else sfMatch.team2Id = winnerId;

      // Recalculate odds if both teams are set
      if (sfMatch.team1Id && sfMatch.team2Id) {
        const t1 = tournament.teams.find(t => t.id === sfMatch.team1Id);
        const t2 = tournament.teams.find(t => t.id === sfMatch.team2Id);
        if (t1 && t2) {
          const odds = calculateOdds(t1, t2);
          sfMatch.team1Odds = odds.team1Odds;
          sfMatch.team2Odds = odds.team2Odds;
        }
      }
    }
  } else if (match.round === 1) {
    // SF → Final
    const finalMatch = tournament.matches.find(m => m.round === 2);
    if (finalMatch) {
      if (match.matchIndex === 0) finalMatch.team1Id = winnerId;
      else finalMatch.team2Id = winnerId;

      if (finalMatch.team1Id && finalMatch.team2Id) {
        const t1 = tournament.teams.find(t => t.id === finalMatch.team1Id);
        const t2 = tournament.teams.find(t => t.id === finalMatch.team2Id);
        if (t1 && t2) {
          const odds = calculateOdds(t1, t2);
          finalMatch.team1Odds = odds.team1Odds;
          finalMatch.team2Odds = odds.team2Odds;
        }
      }
    }
  } else if (match.round === 2) {
    tournament.isComplete = true;
  }
}

// ---------------------------------------------------------------------------
// Get current matches for a round
// ---------------------------------------------------------------------------

export function getRoundMatches(tournament: TournamentState, round: number): TournamentMatch[] {
  return tournament.matches.filter(m => m.round === round);
}

export function getNextUnresolvedMatch(tournament: TournamentState): TournamentMatch | null {
  for (let round = 0; round <= 2; round++) {
    const matches = getRoundMatches(tournament, round);
    for (const m of matches) {
      if (!m.winnerId && m.team1Id && m.team2Id) return m;
    }
  }
  return null;
}

export function isPlayerInMatch(match: TournamentMatch, playerTeamId: string): boolean {
  return match.team1Id === playerTeamId || match.team2Id === playerTeamId;
}

// ---------------------------------------------------------------------------
// Resolve AI vs AI match
// ---------------------------------------------------------------------------

export function resolveAIMatch(
  match: TournamentMatch,
  teams: ColosseumTeam[],
  ruleset: ColosseumRuleset,
): string {
  const team1 = teams.find(t => t.id === match.team1Id);
  const team2 = teams.find(t => t.id === match.team2Id);
  if (!team1 || !team2) return match.team1Id;

  const battle = createBattleFromTeams(team1, team2, false, ruleset);
  const result = runColosseumAutoBattle(battle);
  return result.winningSide === "team1" ? team1.id : team2.id;
}
