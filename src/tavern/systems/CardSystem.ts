// ---------------------------------------------------------------------------
// Tavern mode — card game logic (blackjack variant)
// ---------------------------------------------------------------------------

import type { TavernState } from "../state/TavernState";
import { TavernPhase, drawCard } from "../state/TavernState";
import { cardScore, TavernConfig } from "../config/TavernConfig";

export function placeBet(state: TavernState, amount: number): boolean {
  // Allow betting below minBet if it's all the player has (last chance)
  const effectiveMin = Math.min(state.opponent.minBet, state.gold);
  if (amount < effectiveMin || amount > state.gold) return false;
  state.currentBet = amount;
  state.round++;

  // Deal initial cards
  state.playerHand = [drawCard(state), drawCard(state)];
  state.dealerHand = [drawCard(state), drawCard(state, false)]; // dealer's second card face down

  state.phase = TavernPhase.PLAYER_TURN;
  state.log.push(`Round ${state.round}: Bet ${amount}g.`);

  // Check for blackjack
  if (cardScore(state.playerHand) === 21) {
    state.log.push("Blackjack!");
    state.announcements.push({ text: "BLACKJACK!", color: 0xffd700, timer: 2 });
    revealAndResolve(state);
  }

  return true;
}

export function playerHit(state: TavernState): void {
  if (state.phase !== TavernPhase.PLAYER_TURN) return;
  state.playerHand.push(drawCard(state));
  const score = cardScore(state.playerHand);

  if (score > 21) {
    state.log.push("Bust!");
    state.announcements.push({ text: "BUST!", color: 0xff4444, timer: 2 });
    resolveRound(state, "lose");
  } else if (score === 21) {
    revealAndResolve(state);
  }
}

export function playerStand(state: TavernState): void {
  if (state.phase !== TavernPhase.PLAYER_TURN) return;
  revealAndResolve(state);
}

export function playerDoubleDown(state: TavernState): void {
  if (state.phase !== TavernPhase.PLAYER_TURN) return;
  if (state.playerHand.length !== 2) return; // can only double on first action
  if (state.gold < state.currentBet * 2) return;
  state.currentBet *= 2;
  state.playerHand.push(drawCard(state));
  const score = cardScore(state.playerHand);
  if (score > 21) {
    state.log.push("Double down — Bust!");
    state.announcements.push({ text: "BUST!", color: 0xff4444, timer: 2 });
    resolveRound(state, "lose");
  } else {
    revealAndResolve(state);
  }
}

function revealAndResolve(state: TavernState): void {
  // Reveal dealer's hidden card
  for (const card of state.dealerHand) card.faceUp = true;
  state.phase = TavernPhase.DEALER_TURN;

  // Dealer draws
  const aggThreshold = TavernConfig.DEALER_STAND - Math.floor(state.opponent.aggression * 3);
  while (cardScore(state.dealerHand) < aggThreshold) {
    state.dealerHand.push(drawCard(state));
  }

  const playerScore = cardScore(state.playerHand);
  const dealerScore = cardScore(state.dealerHand);
  const playerBJ = state.playerHand.length === 2 && playerScore === 21;
  const dealerBJ = state.dealerHand.length === 2 && dealerScore === 21;

  if (playerBJ && !dealerBJ) {
    resolveRound(state, "blackjack");
  } else if (dealerScore > 21) {
    state.log.push("Dealer busts!");
    state.announcements.push({ text: "Dealer busts!", color: 0x44ff44, timer: 2 });
    resolveRound(state, "win");
  } else if (playerScore > dealerScore) {
    resolveRound(state, "win");
  } else if (playerScore < dealerScore) {
    resolveRound(state, "lose");
  } else {
    resolveRound(state, "push");
  }
}

function resolveRound(state: TavernState, result: "win" | "lose" | "push" | "blackjack"): void {
  state.phase = TavernPhase.RESULT;
  // Reveal all cards
  for (const card of state.dealerHand) card.faceUp = true;

  let payout = 0;
  if (result === "blackjack") {
    payout = Math.floor(state.currentBet * TavernConfig.BLACKJACK_PAYOUT);
    state.wins++;
    state.streak++;
    state.announcements.push({ text: `+${payout}g BLACKJACK!`, color: 0xffd700, timer: 2.5 });
  } else if (result === "win") {
    payout = Math.floor(state.currentBet * TavernConfig.WIN_PAYOUT);
    state.wins++;
    state.streak++;
    state.announcements.push({ text: `+${payout}g WIN!`, color: 0x44ff44, timer: 2 });
  } else if (result === "push") {
    payout = state.currentBet;
    state.pushes++;
    state.streak = 0;
    state.announcements.push({ text: "PUSH — Bet returned", color: 0xcccccc, timer: 2 });
  } else {
    payout = 0;
    state.losses++;
    state.streak = 0;
    state.announcements.push({ text: `-${state.currentBet}g LOSS`, color: 0xff4444, timer: 2 });
  }

  state.gold = state.gold - state.currentBet + payout;
  state.totalWinnings += payout - state.currentBet;
  if (state.streak > state.bestStreak) state.bestStreak = state.streak;

  state.log.push(`${result.toUpperCase()}: ${payout > state.currentBet ? "+" : ""}${payout - state.currentBet}g`);

  // Check game over — only when truly broke (0 gold) or rounds complete
  if (state.gold <= 0 || state.round >= state.maxRounds) {
    state.phase = TavernPhase.GAME_OVER;
    if (state.gold <= 0) state.log.push("Out of gold!");
    else state.log.push("Session complete.");
  }
}
