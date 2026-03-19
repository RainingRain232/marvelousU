// ---------------------------------------------------------------------------
// Caesar – Trade caravan system: merchants offer buy/sell deals
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarResourceType, RESOURCE_META } from "../config/CaesarResourceDefs";
import type { CaesarState, CaesarCaravanOffer } from "../state/CaesarState";

const CARAVAN_INTERVAL_MIN = 80;   // seconds
const CARAVAN_INTERVAL_MAX = 140;
const CARAVAN_STAY_TIME = 45;      // seconds before caravan leaves

// What merchants might sell to you (resources you might need)
const SELL_OFFERS: { type: CaesarResourceType; amount: number; basePrice: number }[] = [
  { type: CaesarResourceType.WOOD, amount: 15, basePrice: 60 },
  { type: CaesarResourceType.STONE, amount: 10, basePrice: 50 },
  { type: CaesarResourceType.IRON, amount: 5, basePrice: 80 },
  { type: CaesarResourceType.FOOD, amount: 30, basePrice: 70 },
  { type: CaesarResourceType.WHEAT, amount: 20, basePrice: 45 },
];

// What merchants might buy from you (your surplus)
const BUY_OFFERS: { type: CaesarResourceType; amount: number; basePrice: number }[] = [
  { type: CaesarResourceType.FOOD, amount: 20, basePrice: 40 },
  { type: CaesarResourceType.CLOTH, amount: 8, basePrice: 55 },
  { type: CaesarResourceType.TOOLS, amount: 6, basePrice: 70 },
  { type: CaesarResourceType.IRON, amount: 8, basePrice: 50 },
  { type: CaesarResourceType.WHEAT, amount: 15, basePrice: 30 },
  { type: CaesarResourceType.FLOUR, amount: 10, basePrice: 35 },
  { type: CaesarResourceType.WOOD, amount: 15, basePrice: 35 },
  { type: CaesarResourceType.STONE, amount: 10, basePrice: 30 },
];

/**
 * Update trade caravan timer and manage active caravans.
 */
export function updateCaravans(state: CaesarState, dt: number): void {
  // Tick active caravan timer
  if (state.activeCaravan) {
    state.activeCaravan.timer -= dt;
    if (state.activeCaravan.timer <= 0) {
      state.activeCaravan = null; // Caravan leaves
    }
    return;
  }

  // Check for new caravan
  state.caravanTimer -= dt;
  if (state.caravanTimer > 0) return;
  state.caravanTimer = CARAVAN_INTERVAL_MIN + Math.random() * (CARAVAN_INTERVAL_MAX - CARAVAN_INTERVAL_MIN);

  // Don't send caravans until pop > 30
  if (state.population < 30) return;

  // Generate offers
  const offer: CaesarCaravanOffer = {
    selling: [],
    buying: [],
    timer: CARAVAN_STAY_TIME,
  };

  // Pick 1-2 sell offers (merchant sells to you)
  const sellCount = 1 + Math.floor(Math.random() * 2);
  const shuffledSells = [...SELL_OFFERS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < sellCount && i < shuffledSells.length; i++) {
    const s = shuffledSells[i];
    // Price varies +/- 30%
    const price = Math.floor(s.basePrice * (0.7 + Math.random() * 0.6));
    offer.selling.push({ type: s.type, amount: s.amount, price });
  }

  // Pick 2-3 buy offers (merchant buys from you)
  const buyCount = 2 + Math.floor(Math.random() * 2);
  const shuffledBuys = [...BUY_OFFERS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < buyCount && i < shuffledBuys.length; i++) {
    const b = shuffledBuys[i];
    const price = Math.floor(b.basePrice * (0.7 + Math.random() * 0.6));
    // Only offer to buy things the player actually has
    const have = state.resources.get(b.type) ?? 0;
    if (have >= b.amount * 0.5) {
      offer.buying.push({ type: b.type, amount: Math.min(b.amount, Math.floor(have * 0.5)), price });
    }
  }

  if (offer.selling.length > 0 || offer.buying.length > 0) {
    state.activeCaravan = offer;
  }
}

/**
 * Execute a buy trade: you buy resources from the merchant.
 */
export function executeBuyFromCaravan(state: CaesarState, index: number): boolean {
  if (!state.activeCaravan || index >= state.activeCaravan.selling.length) return false;
  const deal = state.activeCaravan.selling[index];
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  if (gold < deal.price) return false;

  state.resources.set(CaesarResourceType.GOLD, gold - deal.price);
  const current = state.resources.get(deal.type) ?? 0;
  const cap = state.resourceCaps.get(deal.type) ?? 300;
  state.resources.set(deal.type, Math.min(cap, current + deal.amount));

  // Remove this offer
  state.activeCaravan.selling.splice(index, 1);
  return true;
}

/**
 * Execute a sell trade: you sell resources to the merchant.
 */
export function executeSellToCaravan(state: CaesarState, index: number): boolean {
  if (!state.activeCaravan || index >= state.activeCaravan.buying.length) return false;
  const deal = state.activeCaravan.buying[index];
  const have = state.resources.get(deal.type) ?? 0;
  if (have < deal.amount) return false;

  state.resources.set(deal.type, have - deal.amount);
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold + deal.price);
  state.tradeProfit += deal.price;

  // Remove this offer
  state.activeCaravan.buying.splice(index, 1);
  return true;
}
