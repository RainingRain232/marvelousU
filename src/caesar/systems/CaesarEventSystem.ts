// ---------------------------------------------------------------------------
// Caesar – Random events system
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState, CaesarEventType } from "../state/CaesarState";

interface EventDef {
  type: CaesarEventType;
  weight: number;
  minPop: number;
  apply: (state: CaesarState) => string;
}

const EVENTS: EventDef[] = [
  {
    type: "bountiful_harvest",
    weight: 3,
    minPop: 10,
    apply(state) {
      // Double food production for EVENT_DURATION (tracked by caller)
      const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
      state.resources.set(CaesarResourceType.FOOD, food + 50);
      return "Bountiful Harvest! +50 food and double farm output.";
    },
  },
  {
    type: "merchant_caravan",
    weight: 3,
    minPop: 30,
    apply(state) {
      const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
      const bonus = 100 + Math.floor(state.population * 0.3);
      state.resources.set(CaesarResourceType.GOLD, gold + bonus);
      return `Merchant Caravan! Traders bring ${bonus} gold.`;
    },
  },
  {
    type: "royal_festival",
    weight: 2,
    minPop: 50,
    apply(state) {
      state.ratings.culture = Math.min(100, state.ratings.culture + CB.FESTIVAL_CULTURE_BOOST);
      state.ratings.favor = Math.min(100, state.ratings.favor + 5);
      return "Royal Festival! Culture and favor boosted.";
    },
  },
  {
    type: "plague",
    weight: 2,
    minPop: 80,
    apply(state) {
      const loss = Math.max(1, Math.floor(state.population * CB.PLAGUE_POP_LOSS));
      let toRemove = loss;
      for (const b of state.buildings.values()) {
        if (toRemove <= 0) break;
        if (b.type !== CaesarBuildingType.HOUSING || b.residents <= 0) continue;
        const remove = Math.min(b.residents, toRemove);
        b.residents -= remove;
        toRemove -= remove;
      }
      state.population = Math.max(0, state.population - loss);
      return `Plague strikes! ${loss} people perished.`;
    },
  },
  {
    type: "drought",
    weight: 2,
    minPop: 40,
    apply(state) {
      const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
      const lost = Math.floor(food * 0.3);
      state.resources.set(CaesarResourceType.FOOD, food - lost);
      return `Drought! Lost ${lost} food. Farm output halved temporarily.`;
    },
  },
  {
    type: "bandit_ambush",
    weight: 2,
    minPop: 60,
    apply(state) {
      // Immediate small raid (triggers on next raid update via timer reset)
      state.raidTimer = 0;
      return "Bandit Ambush! Raiders spotted approaching!";
    },
  },
];

/**
 * Check for random events periodically.
 */
export function updateEvents(state: CaesarState, dt: number): void {
  // Tick active event
  if (state.activeEvent) {
    state.activeEvent.timer -= dt;
    if (state.activeEvent.timer <= 0) {
      state.activeEvent = null;
    }
  }

  // Check for new event
  state.eventTimer -= dt;
  if (state.eventTimer > 0) return;
  state.eventTimer = CB.EVENT_CHECK_INTERVAL;

  // Don't stack events
  if (state.activeEvent) return;

  // Roll
  if (Math.random() > CB.EVENT_CHANCE) return;

  // Filter eligible events
  const eligible = EVENTS.filter((e) => state.population >= e.minPop);
  if (eligible.length === 0) return;

  // Weighted random selection
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen: EventDef | null = null;
  for (const e of eligible) {
    roll -= e.weight;
    if (roll <= 0) {
      chosen = e;
      break;
    }
  }
  if (!chosen) chosen = eligible[eligible.length - 1];

  const message = chosen.apply(state);
  state.activeEvent = {
    type: chosen.type,
    timer: CB.EVENT_DURATION,
    message,
  };
}

/**
 * Check if a production-modifying event is active.
 */
export function getProductionMultiplier(state: CaesarState, resourceType: CaesarResourceType): number {
  if (!state.activeEvent) return 1;
  if (state.activeEvent.type === "bountiful_harvest" && resourceType === CaesarResourceType.WHEAT) {
    return CB.BOUNTIFUL_HARVEST_MULT;
  }
  if (state.activeEvent.type === "drought" && resourceType === CaesarResourceType.WHEAT) {
    return 0.5;
  }
  return 1;
}
