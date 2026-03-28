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
  insuranceBet: number; // 0 = no insurance
  splitHand: Card[] | null; // second hand if split
  splitBet: number;
  opponentTell: string; // hint about dealer's hidden card
  announcements: { text: string; color: number; timer: number }[];
  log: string[];
}

function loadBankroll(): number {
  try {
    const saved = parseInt(localStorage.getItem("tavern_bankroll") ?? "0");
    return saved > 0 ? saved : TavernConfig.STARTING_GOLD;
  } catch { return TavernConfig.STARTING_GOLD; }
}

export function saveBankroll(gold: number): void {
  try { localStorage.setItem("tavern_bankroll", `${Math.max(TavernConfig.STARTING_GOLD, gold)}`); } catch { /* ignore */ }
}

export function createTavernState(opponentIndex: number): TavernState {
  const opp = OPPONENTS[Math.min(opponentIndex, OPPONENTS.length - 1)];
  const deck = shuffleDeck(createDeck(), Date.now() % 2147483647);
  const bankroll = loadBankroll();
  return {
    phase: TavernPhase.BETTING,
    deck, deckIndex: 0,
    playerHand: [], dealerHand: [],
    gold: bankroll,
    currentBet: opp.minBet,
    round: 0,
    maxRounds: TavernConfig.MAX_ROUNDS,
    opponent: opp,
    opponentIndex,
    wins: 0, losses: 0, pushes: 0,
    totalWinnings: 0, streak: 0, bestStreak: 0,
    insuranceBet: 0, splitHand: null, splitBet: 0,
    opponentTell: "",
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
