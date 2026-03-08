// Colosseum mode state interfaces
import type { ColosseumPhase } from "@/types";
import type { PartyMember } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export interface ColosseumTeam {
  id: string;
  name: string;
  members: PartyMember[];
  formation: Record<string, 1 | 2>;
  /** Cached sum of stats used for odds & matchmaking. */
  powerLevel: number;
  isPlayer: boolean;
}

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export interface TournamentMatch {
  id: string;
  /** 0 = quarterfinal, 1 = semifinal, 2 = final */
  round: number;
  matchIndex: number;
  team1Id: string;
  team2Id: string;
  winnerId: string | null;
  team1Odds: number;
  team2Odds: number;
  playerBet: { teamId: string; amount: number } | null;
}

export interface TournamentState {
  teams: ColosseumTeam[];
  matches: TournamentMatch[];
  currentRound: number;
  currentMatchIndex: number;
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Ruleset
// ---------------------------------------------------------------------------

export interface ColosseumRuleset {
  noItems: boolean;
  singleUnit: boolean;
  randomLoadout: boolean;
  /** Stat multiplier applied to the weaker team. 1.0 = no handicap. */
  handicap: number;
  /** Team size (1–6). */
  teamSize: number;
}

export function createDefaultRuleset(): ColosseumRuleset {
  return {
    noItems: false,
    singleUnit: false,
    randomLoadout: false,
    handicap: 1.0,
    teamSize: 4,
  };
}

// ---------------------------------------------------------------------------
// Top-level Colosseum state
// ---------------------------------------------------------------------------

export interface ColosseumState {
  phase: ColosseumPhase;
  playerTeam: ColosseumTeam;
  tournament: TournamentState | null;
  gold: number;
  elo: number;
  season: number;
  seasonWins: number;
  seasonLosses: number;
  tournamentsWon: number;
  tournamentsPlayed: number;
  ruleset: ColosseumRuleset;
  seed: number;
}
