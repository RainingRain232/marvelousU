// ---------------------------------------------------------------------------
// Round Table – Deck System (draw, discard, shuffle, exhaust)
// ---------------------------------------------------------------------------

import { RTRunState, RTCombatState, CardInstance, CardType } from "../types";
import { getCardDef } from "../config/RoundTableCards";
import { RT_BALANCE } from "../config/RoundTableBalance";
import { shuffleArray, makeCardInstance } from "../state/RoundTableState";

export const RoundTableDeckSystem = {
  /** Draw N cards from draw pile into hand. If draw pile is empty, shuffle discard into draw. */
  drawCards(run: RTRunState, combat: RTCombatState, count: number, rng: { next: () => number }): void {
    // Battle Trance: no more draws this turn
    if (run.flags.has("no_more_draw_this_turn")) return;

    for (let i = 0; i < count; i++) {
      if (combat.hand.length >= RT_BALANCE.MAX_HAND_SIZE) break;

      if (combat.drawPile.length === 0) {
        if (combat.discardPile.length === 0) return; // no cards left
        // Shuffle discard into draw
        combat.drawPile = [...combat.discardPile];
        combat.discardPile = [];
        shuffleArray(combat.drawPile, rng.next);
        combat.animQueue.push({ type: "shuffle" });
      }

      const card = combat.drawPile.pop()!;
      combat.hand.push(card);
      combat.animQueue.push({ type: "draw_card", cardUid: card.uid });

      // Morgause passive: drawing a curse grants energy and deals damage
      const def = getCardDef(card.defId);
      if (def.type === CardType.CURSE && run.knightId === "morgause") {
        combat.energy += 1;
        // Deal 3 damage to first enemy
        if (combat.enemies.length > 0) {
          const enemy = combat.enemies[0];
          const dmg = 3;
          enemy.hp -= dmg;
          combat.animQueue.push({ type: "damage", targetUid: enemy.uid, amount: dmg, isPlayer: false });
        }
      }
    }
  },

  /** Discard a card from hand to discard pile. */
  discardCard(combat: RTCombatState, cardUid: number): void {
    const idx = combat.hand.findIndex(c => c.uid === cardUid);
    if (idx === -1) return;
    const [card] = combat.hand.splice(idx, 1);
    combat.discardPile.push(card);
  },

  /** Move all hand cards to discard (end of turn). Handle ethereal cards. */
  discardHand(_run: RTRunState, combat: RTCombatState): void {
    const remaining: CardInstance[] = [];
    for (const card of combat.hand) {
      const def = getCardDef(card.defId);
      if (def.ethereal) {
        combat.exhaustPile.push(card);
        combat.animQueue.push({ type: "exhaust_card", cardUid: card.uid });
      } else {
        remaining.push(card);
      }
    }
    combat.discardPile.push(...remaining);
    combat.hand = [];
  },

  /** Exhaust a card from hand. */
  exhaustCard(combat: RTCombatState, cardUid: number): void {
    const idx = combat.hand.findIndex(c => c.uid === cardUid);
    if (idx === -1) return;
    const [card] = combat.hand.splice(idx, 1);
    combat.exhaustPile.push(card);
    combat.animQueue.push({ type: "exhaust_card", cardUid: card.uid });
  },

  /** Exhaust a random card from hand. */
  exhaustRandomCard(combat: RTCombatState, rng: { next: () => number }): void {
    if (combat.hand.length === 0) return;
    const idx = Math.floor(rng.next() * combat.hand.length);
    const [card] = combat.hand.splice(idx, 1);
    combat.exhaustPile.push(card);
    combat.animQueue.push({ type: "exhaust_card", cardUid: card.uid });
  },

  /** Add a card to the deck (permanent) and to the discard pile (in combat). */
  addCardToDeck(run: RTRunState, defId: string): void {
    const card = makeCardInstance(defId);
    run.deck.push(card);
    run.nextUid = card.uid + 1;
    // Darkstone Periapt: gain 6 Max HP when gaining a curse
    if (defId.startsWith("curse_") && run.relics.includes("darkstone_periapt")) {
      run.maxHp += 6;
      run.hp += 6;
    }
  },

  /** Remove a card from the deck by uid. */
  removeCardFromDeck(run: RTRunState, cardUid: number): boolean {
    const idx = run.deck.findIndex(c => c.uid === cardUid);
    if (idx === -1) return false;
    run.deck.splice(idx, 1);
    return true;
  },

  /** Upgrade a card (swap defId to upgraded version). */
  upgradeCard(run: RTRunState, cardUid: number): boolean {
    const card = run.deck.find(c => c.uid === cardUid);
    if (!card) return false;
    const def = getCardDef(card.defId);
    if (!def.upgradeId) return false;
    card.defId = def.upgradeId;
    card.upgraded = true;
    return true;
  },

  /** Get count of upgradeable cards in deck. */
  getUpgradeableCards(run: RTRunState): CardInstance[] {
    return run.deck.filter(c => {
      const def = getCardDef(c.defId);
      return def.upgradeId != null && !c.upgraded;
    });
  },
};
