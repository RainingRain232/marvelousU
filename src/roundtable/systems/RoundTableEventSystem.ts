// ---------------------------------------------------------------------------
// Round Table – Event System (narrative encounters)
// ---------------------------------------------------------------------------

import { RTRunState, EventEffect, CardRarity } from "../types";
import { getEventDef } from "../config/RoundTableEvents";
import { getCardDef, getRewardPool } from "../config/RoundTableCards";
import { getRelicPool } from "../config/RoundTableRelics";
import { RoundTableDeckSystem } from "./RoundTableDeckSystem";
import { clampHp } from "../state/RoundTableState";
import { RelicRarity } from "../types";

export const RoundTableEventSystem = {

  /** Apply the effects of a chosen event option. */
  applyChoice(
    run: RTRunState,
    eventId: string,
    choiceIndex: number,
    rng: { next: () => number },
  ): void {
    const event = getEventDef(eventId);
    const choice = event.choices[choiceIndex];
    if (!choice) return;

    for (const effect of choice.effects) {
      this._applyEffect(run, effect, rng);
    }

    run.currentEventId = null;
  },

  /** Check if a choice is available. */
  isChoiceAvailable(run: RTRunState, eventId: string, choiceIndex: number): boolean {
    const event = getEventDef(eventId);
    const choice = event.choices[choiceIndex];
    if (!choice) return false;
    if (choice.condition) return choice.condition(run);
    return true;
  },

  // ── Internal ──

  _applyEffect(run: RTRunState, effect: EventEffect, rng: { next: () => number }): void {
    switch (effect.type) {
      case "heal": {
        const amount = typeof effect.value === "number" ? effect.value : 0;
        if (amount <= 1 && amount > 0) {
          // Percentage heal
          run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * amount));
        } else {
          run.hp = Math.min(run.maxHp, run.hp + (amount as number));
        }
        break;
      }

      case "damage": {
        const dmg = typeof effect.value === "number" ? effect.value : 0;
        run.hp -= dmg;
        clampHp(run);
        break;
      }

      case "gold": {
        const amount = typeof effect.value === "number" ? effect.value : 0;
        if (!run.relics.includes("ectoplasm") || amount < 0) {
          run.gold = Math.max(0, run.gold + amount);
        }
        break;
      }

      case "add_card": {
        let cardId = effect.value as string;
        // Handle random card rewards
        if (cardId === "random_rare") {
          const pool = getRewardPool(CardRarity.RARE, run.knightId);
          if (pool.length > 0) cardId = pool[Math.floor(rng.next() * pool.length)].id;
          else return;
        } else if (cardId === "random_uncommon") {
          const pool = getRewardPool(CardRarity.UNCOMMON, run.knightId);
          if (pool.length > 0) cardId = pool[Math.floor(rng.next() * pool.length)].id;
          else return;
        }
        RoundTableDeckSystem.addCardToDeck(run, cardId);
        break;
      }

      case "remove_card": {
        // Flag for UI to handle card selection
        run.flags.add("pending_card_remove");
        break;
      }

      case "add_relic": {
        let relicId = effect.value as string;
        if (relicId === "random_common") {
          const pool = getRelicPool(RelicRarity.COMMON).filter(r => !run.relics.includes(r.id));
          if (pool.length > 0) relicId = pool[Math.floor(rng.next() * pool.length)].id;
          else return;
        }
        run.relics.push(relicId);
        break;
      }

      case "purity": {
        const amount = typeof effect.value === "number" ? effect.value : 0;
        run.purity = Math.max(0, Math.min(100, run.purity + amount));
        break;
      }

      case "max_hp": {
        const amount = typeof effect.value === "number" ? effect.value : 0;
        run.maxHp += amount;
        if (amount > 0) run.hp += amount;
        if (run.hp > run.maxHp) run.hp = run.maxHp;
        if (run.maxHp < 1) run.maxHp = 1;
        break;
      }

      case "upgrade_card": {
        const upgradeable = RoundTableDeckSystem.getUpgradeableCards(run);
        if (upgradeable.length > 0) {
          const card = upgradeable[Math.floor(rng.next() * upgradeable.length)];
          RoundTableDeckSystem.upgradeCard(run, card.uid);
        }
        break;
      }

      case "transform_card": {
        // Transform a random non-starter card into a random card of same/higher rarity
        const transformable = run.deck.filter(c => {
          const d = getCardDef(c.defId);
          return d.rarity !== "starter" && d.rarity !== "curse";
        });
        if (transformable.length > 0) {
          const card = transformable[Math.floor(rng.next() * transformable.length)];
          const pool = getRewardPool(CardRarity.UNCOMMON, run.knightId);
          if (pool.length > 0) {
            card.defId = pool[Math.floor(rng.next() * pool.length)].id;
          }
        }
        break;
      }
    }
  },
};
