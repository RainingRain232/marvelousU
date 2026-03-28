// ---------------------------------------------------------------------------
// Tavern mode — card game logic with suit powers & side bets
// ---------------------------------------------------------------------------

import type { TavernState } from "../state/TavernState";
import { TavernPhase, drawCard } from "../state/TavernState";
import { cardScore, TavernConfig, VALUE_NAMES, SUIT_SYMBOLS } from "../config/TavernConfig";

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

  const swordsCount = suitCounts["swords"] ?? 0;
  const shieldsCount = suitCounts["shields"] ?? 0;
  const crownsCount = suitCounts["crowns"] ?? 0;
  const chalicesCount = suitCounts["chalices"] ?? 0;

  // Swords (Spades): +50% winnings on a winning hand, scaled by count
  if ((result === "win" || result === "blackjack") && swordsCount >= 1) {
    const multiplier = 0.5 * swordsCount;
    const bonus = Math.floor(state.currentBet * multiplier);
    bonusGold += bonus;
    texts.push(`\u2694 Swords Fury (x${swordsCount}): +${bonus}g`);
  }

  // Shields (Clubs): -30% loss reduction on a losing hand, scaled by count
  if (result === "lose" && shieldsCount >= 1) {
    const multiplier = Math.min(0.3 * shieldsCount, 0.9); // cap at 90% refund
    const refund = Math.floor(state.currentBet * multiplier);
    bonusGold += refund;
    texts.push(`\u{1F6E1} Shield Guard (x${shieldsCount}): saved ${refund}g`);
  }

  // Crowns (Hearts): +25% winnings on a winning hand, scaled by count
  if ((result === "win" || result === "blackjack") && crownsCount >= 1) {
    const multiplier = 0.25 * crownsCount;
    const bonus = Math.floor(state.currentBet * multiplier);
    bonusGold += bonus;
    texts.push(`\u{1F451} Crown's Favor (x${crownsCount}): +${bonus}g`);
  }

  // Chalices (Diamonds): +5 gold flat bonus on any win, per chalice card
  if ((result === "win" || result === "blackjack") && chalicesCount >= 1) {
    const bonus = 5 * chalicesCount;
    bonusGold += bonus;
    texts.push(`\u{1F3C6} Chalice Blessing (x${chalicesCount}): +${bonus}g`);
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

  // Card deal flash — show what was dealt
  const c1 = state.playerHand[0], c2 = state.playerHand[1];
  const dealerUp = state.dealerHand[0];
  state.announcements.push({
    text: `${SUIT_SYMBOLS[c1.suit]}${VALUE_NAMES[c1.value]} ${SUIT_SYMBOLS[c2.suit]}${VALUE_NAMES[c2.value]}`,
    color: 0xeeddcc, timer: 1.2,
  });
  state.announcements.push({
    text: `Dealer shows ${SUIT_SYMBOLS[dealerUp.suit]}${VALUE_NAMES[dealerUp.value]}`,
    color: 0xccaa88, timer: 1.2,
  });

  // Reset round state
  state.insuranceBet = 0;
  state.splitHand = null;
  state.splitBet = 0;

  // Check side bets on deal
  checkSideBets(state);

  // Generate opponent tell
  generateTell(state);

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
  const newCard = drawCard(state);
  state.playerHand.push(newCard);
  const score = cardScore(state.playerHand);

  // Card flip flash
  state.announcements.push({
    text: `${SUIT_SYMBOLS[newCard.suit]}${VALUE_NAMES[newCard.value]}`,
    color: 0xeeddcc, timer: 0.8,
  });

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
  const ddCard = drawCard(state);
  state.playerHand.push(ddCard);
  // Card flip flash for double down
  state.announcements.push({
    text: `${SUIT_SYMBOLS[ddCard.suit]}${VALUE_NAMES[ddCard.value]} (DOUBLE)`,
    color: 0xff8844, timer: 1.0,
  });
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

/** Insurance: bet half your current bet that dealer has blackjack */
export function playerInsurance(state: TavernState): void {
  if (state.phase !== TavernPhase.PLAYER_TURN) return;
  if (state.insuranceBet > 0) return; // already insured
  if (state.playerHand.length !== 2) return; // only on initial deal
  // Dealer's face-up card must be Ace (value 1) or 10+
  const dealerUp = state.dealerHand[0];
  if (dealerUp.value !== 1 && dealerUp.value < 10) return;
  const cost = Math.floor(state.currentBet / 2);
  if (state.gold < cost) return;
  state.insuranceBet = cost;
  state.gold -= cost;
  state.announcements.push({ text: `Insurance: ${cost}g`, color: 0xffaa44, timer: 1.5 });
  state.log.push(`Took insurance for ${cost}g.`);
}

/** Split: if both cards same value, split into two hands */
export function playerSplit(state: TavernState): void {
  if (state.phase !== TavernPhase.PLAYER_TURN) return;
  if (state.playerHand.length !== 2) return;
  if (state.splitHand) return; // already split
  const v1 = state.playerHand[0].value >= 10 ? 10 : state.playerHand[0].value;
  const v2 = state.playerHand[1].value >= 10 ? 10 : state.playerHand[1].value;
  if (v1 !== v2) return; // must be same value
  if (state.gold < state.currentBet) return; // need to match bet
  state.splitBet = state.currentBet;
  state.gold -= state.splitBet;
  state.splitHand = [state.playerHand.pop()!];
  // Deal one card to each hand
  state.playerHand.push(drawCard(state));
  state.splitHand.push(drawCard(state));
  state.announcements.push({ text: "SPLIT!", color: 0x88aaff, timer: 1.5 });
  state.log.push("Split hand!");
}

/** Generate opponent tell based on their hidden card — more frequent and meaningful */
function generateTell(state: TavernState): void {
  const hiddenCard = state.dealerHand[1]; // face-down card
  const visibleCard = state.dealerHand[0];
  if (!hiddenCard) { state.opponentTell = ""; return; }

  const hiddenVal = hiddenCard.value >= 10 ? 10 : hiddenCard.value === 1 ? 11 : hiddenCard.value;
  const visibleVal = visibleCard.value >= 10 ? 10 : visibleCard.value === 1 ? 11 : visibleCard.value;
  const dealerTotal = hiddenVal + visibleVal;
  const name = state.opponent.name;

  // Higher-tier opponents are harder to read — but still give tells most of the time
  // Tier 0: always shows a tell, Tier 1: 85%, Tier 2: 70%, Tier 3: 55%
  const tellChance = 1.0 - state.opponent.tier * 0.15;
  if (Math.random() > tellChance) {
    state.opponentTell = `${name} has a perfect poker face.`;
    return;
  }

  // Tells are based on the dealer's TOTAL (visible + hidden), hinting at bust likelihood
  if (dealerTotal >= 20) {
    // Very strong hand — dealer is cocky
    const hints = [
      `${name} grins smugly and stacks their coins.`,
      `${name} barely glances at their cards — supremely confident.`,
      `${name} yawns, seemingly bored. Very strong hand likely.`,
      `${name} is already counting your gold.`,
    ];
    state.opponentTell = hints[Math.floor(Math.random() * hints.length)];
  } else if (dealerTotal >= 17) {
    // Solid hand — dealer is comfortable
    const hints = [
      `${name} nods approvingly at their cards.`,
      `${name} leans back comfortably. Looks like a solid hand.`,
      `${name} places coins neatly — no worries there.`,
      `${name} hums a tune. Seems satisfied.`,
    ];
    state.opponentTell = hints[Math.floor(Math.random() * hints.length)];
  } else if (dealerTotal >= 13) {
    // Risky hand — could go either way
    const hints = [
      `${name} chews their lip thoughtfully.`,
      `${name} glances at the deck nervously.`,
      `${name} taps the table — seems uncertain.`,
      `${name} adjusts their collar. A middling hand, perhaps?`,
    ];
    state.opponentTell = hints[Math.floor(Math.random() * hints.length)];
  } else {
    // Weak hand — high bust chance when they draw
    const hints = [
      `${name} looks visibly nervous and avoids eye contact.`,
      `${name} fidgets with their coins anxiously.`,
      `${name} gulps and reaches for their drink. Weak hand likely.`,
      `${name} shifts uncomfortably. They'll need to draw more cards.`,
      `${name} mutters a prayer under their breath.`,
    ];
    state.opponentTell = hints[Math.floor(Math.random() * hints.length)];
  }
}

function revealAndResolve(state: TavernState): void {
  for (const card of state.dealerHand) card.faceUp = true;
  state.phase = TavernPhase.DEALER_TURN;

  // Opponent difficulty scaling:
  // Early opponents (low tier) play recklessly — hit on soft 17s, sometimes hit too high
  // Later opponents play optimal basic strategy
  const tier = state.opponent.tier;
  const dealerPlay = () => {
    const score = cardScore(state.dealerHand);
    const hasAce = state.dealerHand.some(c => c.value === 1);
    const softTotal = hasAce && score <= 21 && score - 10 > 0;

    if (tier === 0) {
      // Tier 0 (Pip, Marta): Reckless — hits on 17, sometimes hits on 18
      if (score < 17) return true;
      if (score === 17 && softTotal) return true; // hit soft 17
      if (score === 17 && Math.random() < 0.3) return true; // sometimes recklessly hit hard 17
      if (score === 18 && Math.random() < 0.1) return true; // rarely hit 18
      return false;
    } else if (tier === 1) {
      // Tier 1 (Aldric, Elena): Moderate — hits soft 17, otherwise standard
      if (score < 17) return true;
      if (score === 17 && softTotal) return true;
      return false;
    } else {
      // Tier 2+ (Gareth, Morgan, Arthur): Optimal — stand on all 17+, always hit below 17
      if (score < 17) return true;
      return false;
    }
  };

  while (dealerPlay()) {
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

  // Insurance check: if dealer has blackjack and player insured, pay 2:1
  if (state.insuranceBet > 0) {
    const dealerBJ = state.dealerHand.length === 2 && cardScore(state.dealerHand) === 21;
    if (dealerBJ) {
      const insurancePayout = state.insuranceBet * 3; // 2:1 + return
      payout += insurancePayout;
      state.announcements.push({ text: `Insurance pays! +${insurancePayout}g`, color: 0x44ccaa, timer: 2 });
    } else {
      state.log.push("Insurance lost.");
    }
    state.insuranceBet = 0;
  }

  // Split hand resolution: if split hand exists, compare it separately
  if (state.splitHand && state.splitHand.length > 0) {
    const splitScore = cardScore(state.splitHand);
    const dealerScore = cardScore(state.dealerHand);
    if (splitScore <= 21 && (dealerScore > 21 || splitScore > dealerScore)) {
      const splitPayout = Math.floor(state.splitBet * 2);
      payout += splitPayout;
      state.announcements.push({ text: `Split hand wins! +${splitPayout}g`, color: 0x88aaff, timer: 2 });
    } else if (splitScore <= 21 && splitScore === dealerScore) {
      payout += state.splitBet; // push
    }
    state.splitHand = null;
  }

  // Apply suit powers
  const suitBonus = checkSuitPowers(state, result);
  payout += suitBonus.bonusGold;
  for (const txt of suitBonus.bonusText) {
    state.announcements.push({ text: txt, color: 0xffaa44, timer: 2 });
    state.log.push(txt);
  }

  // Streak bonus: consecutive wins beyond threshold earn flat bonus
  if ((result === "win" || result === "blackjack") && state.streak >= TavernConfig.STREAK_BONUS_THRESHOLD) {
    const streakBonus = TavernConfig.STREAK_BONUS_GOLD * (state.streak - TavernConfig.STREAK_BONUS_THRESHOLD + 1);
    payout += streakBonus;
    state.announcements.push({ text: `\u{1F525} ${state.streak}x Streak! +${streakBonus}g`, color: 0xff8844, timer: 2 });
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

/** Hi-Lo running count for card counting: +1 for 2-6, 0 for 7-9, -1 for 10-A */
export function getRunningCount(state: TavernState): number {
  let count = 0;
  for (let i = 0; i < state.deckIndex; i++) {
    const v = state.deck[i].value;
    if (v >= 2 && v <= 6) count++;
    else if (v === 1 || v >= 10) count--;
  }
  return count;
}

/** True count = running count / decks remaining */
export function getTrueCount(state: TavernState): number {
  const remaining = cardsRemaining(state);
  if (remaining <= 0) return 0;
  const decksLeft = remaining / 52;
  return decksLeft > 0 ? getRunningCount(state) / decksLeft : 0;
}

/** Hint based on true count: positive = favorable, negative = unfavorable */
export function getCountHint(state: TavernState): string {
  const tc = getTrueCount(state);
  if (tc >= 3) return "The deck favors you heavily — bet big!";
  if (tc >= 1) return "The deck is slightly in your favor.";
  if (tc <= -3) return "The deck favors the dealer — bet cautiously.";
  if (tc <= -1) return "The deck is slightly against you.";
  return "The deck is neutral.";
}
