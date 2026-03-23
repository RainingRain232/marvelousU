// ---------------------------------------------------------------------------
// Round Table – Reward System (card rewards, gold, relics, shop)
// ---------------------------------------------------------------------------

import {
  RTRunState, CardRarity, ShopItem, MapNodeType, RelicRarity,
} from "../types";
import { getRewardPool } from "../config/RoundTableCards";
import { getRelicPool } from "../config/RoundTableRelics";
import { getEnemyDef } from "../config/RoundTableEnemies";
import { getRandomPotion } from "../config/RoundTablePotions";
import { RT_BALANCE } from "../config/RoundTableBalance";
import { RoundTableDeckSystem } from "./RoundTableDeckSystem";

export const RoundTableRewardSystem = {

  /** Generate combat rewards after winning a fight. */
  generateCombatRewards(
    run: RTRunState,
    enemyIds: string[],
    nodeType: MapNodeType,
    rng: { next: () => number },
  ): void {
    // Gold
    let totalGold = 0;
    for (const id of enemyIds) {
      const def = getEnemyDef(id);
      totalGold += Math.round(def.goldReward[0] + rng.next() * (def.goldReward[1] - def.goldReward[0]));
    }
    if (!run.relics.includes("ectoplasm")) {
      run.rewardGold = totalGold;
    }

    // Card choices
    run.rewardCards = this._generateCardChoices(run, rng);

    // Potion
    run.rewardPotions = [];
    if (!run.relics.includes("sozu") && rng.next() < RT_BALANCE.POTION_DROP_CHANCE) {
      const pot = getRandomPotion(rng.next.bind(rng));
      run.rewardPotions.push(pot.id);
    }

    // Relic (elites always, bosses always)
    run.rewardRelics = [];
    if (nodeType === MapNodeType.ELITE) {
      const relic = this._pickRandomRelic(run, RelicRarity.UNCOMMON, rng);
      if (relic) run.rewardRelics.push(relic);
      // Black star: second relic
      if (run.relics.includes("black_star")) {
        const relic2 = this._pickRandomRelic(run, RelicRarity.UNCOMMON, rng);
        if (relic2) run.rewardRelics.push(relic2);
      }
    }
    if (nodeType === MapNodeType.BOSS) {
      const relic = this._pickRandomRelic(run, RelicRarity.BOSS, rng);
      if (relic) run.rewardRelics.push(relic);
    }

    // Score
    if (nodeType === MapNodeType.ELITE) run.score += RT_BALANCE.SCORE_PER_ELITE;
    else if (nodeType === MapNodeType.BOSS) run.score += RT_BALANCE.SCORE_PER_BOSS;
    else run.score += RT_BALANCE.SCORE_PER_ENEMY * enemyIds.length;
  },

  /** Collect gold reward. */
  collectGold(run: RTRunState): void {
    if (run.relics.includes("ectoplasm")) return;
    run.gold += run.rewardGold;
    run.rewardGold = 0;
  },

  /** Pick a card reward. */
  collectCard(run: RTRunState, defId: string): void {
    RoundTableDeckSystem.addCardToDeck(run, defId);
    run.rewardCards = null;
  },

  /** Skip card reward. */
  skipCards(run: RTRunState): void {
    run.rewardCards = null;
    // Reward for skipping: small gold bonus
    if (!run.relics.includes("ectoplasm")) {
      run.gold += 12;
    }
  },

  /** Collect a relic reward. */
  collectRelic(run: RTRunState, relicId: string): void {
    run.relics.push(relicId);
    const idx = run.rewardRelics.indexOf(relicId);
    if (idx !== -1) run.rewardRelics.splice(idx, 1);
  },

  /** Collect potion reward. */
  collectPotion(run: RTRunState, potionId: string): boolean {
    if (run.relics.includes("sozu")) return false; // sozu blocks potions
    const slot = run.potions.findIndex(p => p === null);
    if (slot === -1) return false; // no room
    run.potions[slot] = { defId: potionId };
    const idx = run.rewardPotions.indexOf(potionId);
    if (idx !== -1) run.rewardPotions.splice(idx, 1);
    return true;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════════════════════════════

  /** Generate shop inventory. */
  generateShop(run: RTRunState, rng: { next: () => number }): void {
    const items: ShopItem[] = [];

    // 5 cards
    const commonCards = getRewardPool(CardRarity.COMMON, run.knightId);
    const uncommonCards = getRewardPool(CardRarity.UNCOMMON, run.knightId);
    const rareCards = getRewardPool(CardRarity.RARE, run.knightId);

    for (let i = 0; i < 3; i++) {
      if (commonCards.length > 0) {
        const card = commonCards.splice(Math.floor(rng.next() * commonCards.length), 1)[0];
        const cost = RT_BALANCE.SHOP_COMMON_CARD_COST[0] +
          Math.floor(rng.next() * (RT_BALANCE.SHOP_COMMON_CARD_COST[1] - RT_BALANCE.SHOP_COMMON_CARD_COST[0]));
        items.push({ type: "card", id: card.id, cost, sold: false });
      }
    }
    for (let i = 0; i < 2; i++) {
      const pool = i === 0 ? uncommonCards : rareCards;
      const costRange = i === 0 ? RT_BALANCE.SHOP_UNCOMMON_CARD_COST : RT_BALANCE.SHOP_RARE_CARD_COST;
      if (pool.length > 0) {
        const card = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
        const cost = costRange[0] + Math.floor(rng.next() * (costRange[1] - costRange[0]));
        items.push({ type: "card", id: card.id, cost, sold: false });
      }
    }

    // 2 relics
    for (let i = 0; i < 2; i++) {
      const rarity = rng.next() < 0.6 ? RelicRarity.COMMON : RelicRarity.UNCOMMON;
      const relicId = this._pickRandomRelic(run, rarity, rng);
      if (relicId) {
        const costRange = rarity === RelicRarity.COMMON
          ? RT_BALANCE.SHOP_COMMON_RELIC_COST : RT_BALANCE.SHOP_UNCOMMON_RELIC_COST;
        const cost = costRange[0] + Math.floor(rng.next() * (costRange[1] - costRange[0]));
        items.push({ type: "relic", id: relicId, cost, sold: false });
      }
    }

    // 1 potion
    const pot = getRandomPotion(rng.next.bind(rng));
    items.push({ type: "potion", id: pot.id, cost: 50, sold: false });

    // Card removal
    items.push({ type: "remove_card", id: "remove", cost: RT_BALANCE.CARD_REMOVE_COST, sold: false });

    // Ascension 12: shop prices +10%
    if (run.ascension >= 12) {
      for (const item of items) {
        item.cost = Math.ceil(item.cost * 1.1);
      }
    }

    run.shop = items;
  },

  /** Buy a shop item. Returns true if purchased. */
  buyShopItem(run: RTRunState, index: number): boolean {
    if (!run.shop) return false;
    const item = run.shop[index];
    if (!item || item.sold) return false;
    if (run.gold < item.cost) return false;

    run.gold -= item.cost;
    item.sold = true;

    switch (item.type) {
      case "card":
        RoundTableDeckSystem.addCardToDeck(run, item.id);
        break;
      case "relic":
        run.relics.push(item.id);
        break;
      case "potion": {
        const slot = run.potions.findIndex(p => p === null);
        if (slot === -1) { item.sold = false; run.gold += item.cost; return false; }
        run.potions[slot] = { defId: item.id };
        break;
      }
      case "remove_card":
        // Will be handled by UI (player picks which card to remove)
        run.flags.add("pending_card_remove");
        break;
    }

    return true;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════

  _generateCardChoices(run: RTRunState, rng: { next: () => number }): string[] {
    const choices: string[] = [];
    for (let i = 0; i < RT_BALANCE.CARD_REWARD_CHOICES; i++) {
      const roll = rng.next();
      let rarity: CardRarity;
      if (roll < 0.6) rarity = CardRarity.COMMON;
      else if (roll < 0.9) rarity = CardRarity.UNCOMMON;
      else rarity = CardRarity.RARE;

      let pool = getRewardPool(rarity, run.knightId)
        .filter(c => !choices.includes(c.id));

      // ── Purity-gated filtering ──
      // High purity (75+): Virtue cards appear more often, Sin cards excluded
      if (run.purity >= RT_BALANCE.PURITY_HOLY_THRESHOLD) {
        pool = pool.filter(c => c.type !== "sin");
        // Boost virtue chance: add virtue cards again to weight them
        const virtues = pool.filter(c => c.type === "virtue");
        pool = [...pool, ...virtues];
      }
      // Low purity (25-): Sin cards appear more, Virtue cards excluded
      if (run.purity <= RT_BALANCE.PURITY_DARK_THRESHOLD) {
        pool = pool.filter(c => c.type !== "virtue");
        const sins = pool.filter(c => c.type === "sin");
        pool = [...pool, ...sins];
      }

      if (pool.length === 0) continue;
      choices.push(pool[Math.floor(rng.next() * pool.length)].id);
    }
    return choices;
  },

  _pickRandomRelic(run: RTRunState, rarity: RelicRarity, rng: { next: () => number }): string | null {
    const pool = getRelicPool(rarity).filter(r => !run.relics.includes(r.id));
    if (pool.length === 0) return null;
    return pool[Math.floor(rng.next() * pool.length)].id;
  },
};
