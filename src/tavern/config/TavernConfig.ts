// ---------------------------------------------------------------------------
// Tavern mode — card game configuration
// ---------------------------------------------------------------------------

export type Suit = "swords" | "chalices" | "shields" | "crowns";
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  value: CardValue;
  faceUp: boolean;
}

export const SUITS: Suit[] = ["swords", "chalices", "shields", "crowns"];
export const SUIT_COLORS: Record<Suit, number> = {
  swords: 0xcc4444,
  chalices: 0x4488cc,
  shields: 0xccaa44,
  crowns: 0xcc88ff,
};
export const SUIT_SYMBOLS: Record<Suit, string> = {
  swords: "\u2694",
  chalices: "\u{1F3C6}",
  shields: "\u{1F6E1}",
  crowns: "\u{1F451}",
};
export const VALUE_NAMES: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
};

export interface OpponentDef {
  id: string;
  name: string;
  title: string;
  color: number;
  minBet: number;
  aggression: number; // 0-1, how likely to stand on lower totals
  tier: number;
}

export const OPPONENTS: OpponentDef[] = [
  { id: "pip", name: "Pip", title: "the Squire", color: 0x886644, minBet: 5, aggression: 0.3, tier: 0 },
  { id: "marta", name: "Marta", title: "the Barmaid", color: 0xcc8866, minBet: 5, aggression: 0.5, tier: 0 },
  { id: "aldric", name: "Aldric", title: "the Merchant", color: 0x88aa44, minBet: 10, aggression: 0.4, tier: 1 },
  { id: "elena", name: "Elena", title: "the Witch", color: 0x8844cc, minBet: 15, aggression: 0.6, tier: 1 },
  { id: "gareth", name: "Sir Gareth", title: "the Knight", color: 0x888899, minBet: 20, aggression: 0.5, tier: 2 },
  { id: "morgan", name: "Morgan", title: "le Fay", color: 0xcc44aa, minBet: 30, aggression: 0.7, tier: 2 },
  { id: "arthur", name: "King Arthur", title: "himself", color: 0xffd700, minBet: 50, aggression: 0.6, tier: 3 },
];

export const TavernConfig = {
  STARTING_GOLD: 100,
  TARGET_SCORE: 21,
  DEALER_STAND: 17,
  CARD_WIDTH: 60,
  CARD_HEIGHT: 84,
  BLACKJACK_PAYOUT: 2.5, // 3:2 payout
  WIN_PAYOUT: 2.0,
  PUSH_PAYOUT: 1.0, // get bet back
  MAX_ROUNDS: 10,
  STREAK_BONUS_THRESHOLD: 3, // consecutive wins needed for bonus
  STREAK_BONUS_GOLD: 10, // flat bonus per win beyond threshold
} as const;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let v = 1; v <= 13; v++) {
      deck.push({ suit, value: v as CardValue, faceUp: true });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], seed: number): Card[] {
  let s = seed;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardScore(cards: Card[]): number {
  let total = 0, aces = 0;
  for (const card of cards) {
    if (card.value === 1) { aces++; total += 11; }
    else if (card.value >= 10) total += 10;
    else total += card.value;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
