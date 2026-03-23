// ---------------------------------------------------------------------------
// Tavern mode — card game logic with suit powers & side bets
// ---------------------------------------------------------------------------

import type { TavernState } from "../state/TavernState";
import { TavernPhase, drawCard } from "../state/TavernState";
import { cardScore, TavernConfig, type Card } from "../config/TavernConfig";

// ---------------------------------------------------------------------------
// Suit powers (checked at end of round)
// ---------------------------------------------------------------------------

function checkSuitPowers(state: TavernState, result: string): { bonusGold: number; bonusText: string[] } {
  let bonusGold = 0;
  const texts: string[] = [];
  const hand = state.playerHand;

  // Count suits in hand
  const suitCounts: Record<string, number> = {};
  for (const c of hand) { suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1; }

  // Swords: if majority suit in winning hand, +50% payout
  if (result === "win" || result === "blackjack") {
    if ((suitCounts["swords"] ?? 0) >= 2) {
      const bonus = Math.floor(state.currentBet * 0.5);
      bonusGold += bonus;
      texts.push(`\u2694 Swords Fury: +${bonus}g`);
    }
  }

  // Shields: if you have 2+ shields and lose, refund 30% of bet
  if (result === "lose" && (suitCounts["shields"] ?? 0) >= 2) {
    const refund = Math.floor(state.currentBet * 0.3);
    bonusGold += refund;
    texts.push(`\u{1F6E1} Shield Guard: saved ${refund}g`);
  }

  // Crowns: any crown card in a winning hand gives +25% bonus
  if ((result === "win" || result === "blackjack") && (suitCounts["crowns"] ?? 0) >= 1) {
    const bonus = Math.floor(state.currentBet * 0.25);
    bonusGold += bonus;
    texts.push(`\u{1F451} Crown's Favor: +${bonus}g`);
  }

  // Chalices: if hand has 2+ chalices, gain +5 gold flat (healing)
  if ((suitCounts["chalices"] ?? 0) >= 2) {
    bonusGold += 5;
    texts.push(`\u{1F3C6} Chalice Blessing: +5g`);
  }

  return { bonusGold, bonusText: texts };
}

// ---------------------------------------------------------------------------
// Side bets (checked on deal)
// ---------------------------------------------------------------------------

function checkSideBets(state: TavernState): void {
  const hand = state.playerHand;
  if (hand.length < 2) return;

  // Perfect Pair: both cards same value
  if (hand[0].value === hand[1].value) {
    const bonus = state.currentBet; // 1:1 side bet payout
    state.gold += bonus;
    state.totalWinnings += bonus;
    state.announcements.push({ text: `PERFECT PAIR! +${bonus}g`, color: 0xff88ff, timer: 2 });
    state.log.push(`Perfect Pair bonus: +${bonus}g`);
  }

  // Suited Blackjack: both cards same suit AND blackjack
  if (hand[0].suit === hand[1].suit && cardScore(hand) === 21) {
    const bonus = Math.floor(state.currentBet * 1.5);
    state.gold += bonus;
    state.totalWinnings += bonus;
    state.announcements.push({ text: `SUITED BLACKJACK! +${bonus}g`, color: 0xffd700, timer: 2.5 });
    state.log.push(`Suited Blackjack bonus: +${bonus}g`);
  }
}

// ---------------------------------------------------------------------------
// Opponent reactions
// ---------------------------------------------------------------------------

const OPPONENT_REACTIONS = {
  win: [
    "{name} scowls and pushes coins across the table.",
    "{name} nods grudgingly. \"Well played.\"",
    "{name} mutters under their breath.",
    "{name} sighs and reaches for their drink.",
  ],
  lose: [
    "{name} grins widely. \"Better luck next time.\"",
    "{name} laughs and rakes in the gold.",
    "{name} smirks. \"The cards favor me tonight.\"",
    "{name} leans back with satisfaction.",
  ],
  blackjack: [
    "{name} slams the table. \"Impossible!\"",
    "{name} stares in disbelief.",
    "{name} gasps. \"The gods favor you!\"",
  ],
  push: [
    "{name} shrugs. \"Again, then.\"",
    "{name} raises an eyebrow. \"Even match.\"",
  ],
  bust: [
    "{name} chuckles. \"Too greedy.\"",
    "{name} shakes their head slowly.",
  ],
};

function getReaction(state: TavernState, result: string): string {
  const pool = OPPONENT_REACTIONS[result as keyof typeof OPPONENT_REACTIONS] ?? OPPONENT_REACTIONS.push;
  const text = pool[Math.floor(Math.random() * pool.length)];
  return text.replace("{name}", state.opponent.name);
}

// ---------------------------------------------------------------------------
// Core game actions
// ---------------------------------------------------------------------------

export function placeBet(state: TavernState, amount: number): boolean {
  const effectiveMin = Math.min(state.opponent.minBet, state.gold);
  if (amount < effectiveMin || amount > state.gold) return false;
  state.currentBet = amount;
  state.round++;

  state.playerHand = [drawCard(state), drawCard(state)];
  state.dealerHand = [drawCard(state), drawCard(state, false)];

  state.phase = TavernPhase.PLAYER_TURN;
  state.log.push(`Round ${state.round}: Bet ${amount}g.`);

  // Check side bets on deal
  checkSideBets(state);

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
    state.log.push(getReaction(state, "bust"));
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
  if (state.playerHand.length !== 2) return;
  if (state.gold < state.currentBet * 2) return;
  state.currentBet *= 2;
  state.playerHand.push(drawCard(state));
  const score = cardScore(state.playerHand);
  if (score > 21) {
    state.log.push("Double down — Bust!");
    state.log.push(getReaction(state, "bust"));
    state.announcements.push({ text: "BUST!", color: 0xff4444, timer: 2 });
    resolveRound(state, "lose");
  } else {
    revealAndResolve(state);
  }
}

function revealAndResolve(state: TavernState): void {
  for (const card of state.dealerHand) card.faceUp = true;
  state.phase = TavernPhase.DEALER_TURN;

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
  for (const card of state.dealerHand) card.faceUp = true;

  let payout = 0;
  if (result === "blackjack") {
    payout = Math.floor(state.currentBet * TavernConfig.BLACKJACK_PAYOUT);
    state.wins++; state.streak++;
    state.announcements.push({ text: `+${payout}g BLACKJACK!`, color: 0xffd700, timer: 2.5 });
  } else if (result === "win") {
    payout = Math.floor(state.currentBet * TavernConfig.WIN_PAYOUT);
    state.wins++; state.streak++;
    state.announcements.push({ text: `+${payout}g WIN!`, color: 0x44ff44, timer: 2 });
  } else if (result === "push") {
    payout = state.currentBet;
    state.pushes++; state.streak = 0;
    state.announcements.push({ text: "PUSH", color: 0xcccccc, timer: 2 });
  } else {
    payout = 0;
    state.losses++; state.streak = 0;
    state.announcements.push({ text: `-${state.currentBet}g LOSS`, color: 0xff4444, timer: 2 });
  }

  // Apply suit powers
  const suitBonus = checkSuitPowers(state, result);
  payout += suitBonus.bonusGold;
  for (const txt of suitBonus.bonusText) {
    state.announcements.push({ text: txt, color: 0xffaa44, timer: 2 });
    state.log.push(txt);
  }

  state.gold = state.gold - state.currentBet + payout;
  state.totalWinnings += payout - state.currentBet;
  if (state.streak > state.bestStreak) state.bestStreak = state.streak;

  // Opponent reaction
  state.log.push(getReaction(state, result));

  state.log.push(`${result.toUpperCase()}: ${payout > state.currentBet ? "+" : ""}${payout - state.currentBet}g`);

  if (state.gold <= 0 || state.round >= state.maxRounds) {
    state.phase = TavernPhase.GAME_OVER;
    if (state.gold <= 0) state.log.push("Out of gold!");
    else state.log.push("Session complete.");
  }
}

/** Get number of cards remaining in deck */
export function cardsRemaining(state: TavernState): number {
  return state.deck.length - state.deckIndex;
}
