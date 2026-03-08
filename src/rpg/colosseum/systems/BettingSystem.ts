// Colosseum betting system — place bets and resolve payouts
import type { TournamentMatch } from "../state/ColosseumState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BetResult {
  won: boolean;
  payout: number;
  originalBet: number;
  odds: number;
}

// ---------------------------------------------------------------------------
// Place bet
// ---------------------------------------------------------------------------

export function placeBet(
  match: TournamentMatch,
  teamId: string,
  amount: number,
  playerGold: number,
): boolean {
  if (amount <= 0) return false;
  if (playerGold < amount) return false;
  if (match.winnerId !== null) return false; // already resolved
  if (teamId !== match.team1Id && teamId !== match.team2Id) return false;
  if (match.playerBet !== null) return false; // already bet

  match.playerBet = { teamId, amount };
  return true;
}

// ---------------------------------------------------------------------------
// Resolve bet
// ---------------------------------------------------------------------------

export function resolveBet(match: TournamentMatch, winnerId: string): BetResult | null {
  if (!match.playerBet) return null;

  const bet = match.playerBet;
  const odds = bet.teamId === match.team1Id ? match.team1Odds : match.team2Odds;
  const won = bet.teamId === winnerId;

  return {
    won,
    payout: won ? Math.floor(bet.amount * odds) : 0,
    originalBet: bet.amount,
    odds,
  };
}
