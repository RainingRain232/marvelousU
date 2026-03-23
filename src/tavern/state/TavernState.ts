// ---------------------------------------------------------------------------
// Tavern mode — game state
// ---------------------------------------------------------------------------

import type { Card, OpponentDef } from "../config/TavernConfig";
import { createDeck, shuffleDeck, OPPONENTS, TavernConfig } from "../config/TavernConfig";

export enum TavernPhase {
  BETTING = "betting",
  PLAYER_TURN = "player_turn",
  DEALER_TURN = "dealer_turn",
  RESULT = "result",
  GAME_OVER = "game_over",
}

export interface TavernState {
  phase: TavernPhase;
  deck: Card[];
  deckIndex: number;
  playerHand: Card[];
  dealerHand: Card[];
  gold: number;
  currentBet: number;
  round: number;
  maxRounds: number;
  opponent: OpponentDef;
  opponentIndex: number;
  wins: number;
  losses: number;
  pushes: number;
  totalWinnings: number;
  streak: number;
  bestStreak: number;
  announcements: { text: string; color: number; timer: number }[];
  log: string[];
}

export function createTavernState(opponentIndex: number): TavernState {
  const opp = OPPONENTS[Math.min(opponentIndex, OPPONENTS.length - 1)];
  const deck = shuffleDeck(createDeck(), Date.now() % 2147483647);
  return {
    phase: TavernPhase.BETTING,
    deck, deckIndex: 0,
    playerHand: [], dealerHand: [],
    gold: TavernConfig.STARTING_GOLD,
    currentBet: opp.minBet,
    round: 0,
    maxRounds: TavernConfig.MAX_ROUNDS,
    opponent: opp,
    opponentIndex,
    wins: 0, losses: 0, pushes: 0,
    totalWinnings: 0, streak: 0, bestStreak: 0,
    announcements: [],
    log: [`You sit down at ${opp.name}'s table.`],
  };
}

export function drawCard(state: TavernState, faceUp = true): Card {
  if (state.deckIndex >= state.deck.length) {
    state.deck = shuffleDeck(createDeck(), Date.now() % 2147483647);
    state.deckIndex = 0;
  }
  const card = { ...state.deck[state.deckIndex++], faceUp };
  return card;
}
