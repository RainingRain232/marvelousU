// ---------------------------------------------------------------------------
// Caesar – Economy: taxes, tribute, maintenance, food
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS, getMaintenanceCost } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";
import { consumeHousingGoods } from "./CaesarHousingSystem";
import { isBuildingRoadConnected } from "./CaesarBuildingSystem";

/**
 * Collect taxes and pay maintenance.
 */
export function updateTaxes(state: CaesarState, dt: number): void {
  state.taxTimer += dt;
  if (state.taxTimer < CB.TAX_INTERVAL) return;
  state.taxTimer -= CB.TAX_INTERVAL;

  const mod = DIFFICULTY_MODS[state.difficulty];

  // --- Income: taxes from housing ---
  let totalTax = 0;
  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING) continue;
    if (!b.built || b.residents === 0) continue;

    const taxPerPerson = CB.HOUSING_TAX_PER_PERSON[b.housingTier] * mod.taxMult;
    totalTax += b.residents * taxPerPerson;
  }
  totalTax = Math.floor(totalTax);

  // --- Expenses: building maintenance ---
  let totalMaintenance = 0;
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    totalMaintenance += getMaintenanceCost(b.type);
  }
  totalMaintenance = Math.floor(totalMaintenance * mod.maintenanceMult);

  // Apply
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  const net = totalTax - totalMaintenance;
  state.resources.set(CaesarResourceType.GOLD, Math.max(0, gold + net));
  state.monthlyIncome = totalTax;
  state.monthlyExpense = totalMaintenance;
}

/**
 * Handle King's tribute demands. Scales with population.
 */
export function updateTribute(state: CaesarState, dt: number): void {
  const mod = DIFFICULTY_MODS[state.difficulty];
  state.tributeTimer -= dt;

  if (state.tributeTimer <= 0) {
    state.tributeTimer = CB.TRIBUTE_INTERVAL;

    // Tribute scales with population
    const tributeAmount = Math.floor(
      (CB.TRIBUTE_BASE_AMOUNT + state.population * CB.TRIBUTE_PER_POP) * mod.tributeMult
    );
    const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;

    if (gold >= tributeAmount) {
      state.resources.set(CaesarResourceType.GOLD, gold - tributeAmount);
      state.tributesPaid++;
      state.ratings.favor = Math.min(100, state.ratings.favor + CB.FAVOR_PER_TRIBUTE);
    } else {
      state.tributesMissed++;
      state.ratings.favor = Math.max(0, state.ratings.favor + CB.FAVOR_PENALTY);
    }
  }
}

/**
 * Track food consumption by population.
 * If food runs out, people leave.
 */
export function updateFoodConsumption(state: CaesarState, dt: number): void {
  if (state.population === 0) return;

  // 1 food per 10 people per tax interval
  const foodPerInterval = Math.ceil(state.population / 10);
  const foodConsumedPerSec = foodPerInterval / CB.TAX_INTERVAL;

  // Bountiful harvest event doubles production but doesn't change consumption
  const consumed = foodConsumedPerSec * dt;

  const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
  if (food > 0) {
    state.resources.set(CaesarResourceType.FOOD, Math.max(0, food - consumed));
  } else {
    // No food — people leave (1 per 2 seconds)
    const leaving = Math.min(state.population, Math.ceil(dt * 0.5));
    if (leaving > 0) {
      let toRemove = leaving;
      for (const b of state.buildings.values()) {
        if (toRemove <= 0) break;
        if (b.type !== CaesarBuildingType.HOUSING || b.residents <= 0) continue;
        const remove = Math.min(b.residents, toRemove);
        b.residents -= remove;
        toRemove -= remove;
      }
      state.population = Math.max(0, state.population - leaving);
    }
  }
}

/**
 * Calculate employment with priority system.
 * High-priority buildings get workers first, then normal, then low.
 */
export function updateEmployment(state: CaesarState): void {
  // Collect work buildings by priority
  const priorityBuckets: { high: { id: number; needed: number }[]; normal: { id: number; needed: number }[]; low: { id: number; needed: number }[] } = { high: [], normal: [], low: [] };

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type === CaesarBuildingType.HOUSING || b.type === CaesarBuildingType.ROAD ||
        b.type === CaesarBuildingType.WALL || b.type === CaesarBuildingType.GATE) continue;
    b.workers = 0; // Reset

    const { maxWorkers } = CAESAR_BUILDING_DEFS[b.type];
    if (maxWorkers > 0) {
      priorityBuckets[b.workerPriority].push({ id: b.id, needed: maxWorkers });
    }
  }

  let remaining = state.population;

  // Assign workers: high priority first, filling each building up to max
  for (const prio of ["high", "normal", "low"] as const) {
    const bucket = priorityBuckets[prio];
    if (bucket.length === 0 || remaining <= 0) continue;

    let totalNeeded = bucket.reduce((s, wb) => s + wb.needed, 0);
    if (totalNeeded === 0) continue;

    // If enough workers for this priority tier, fill all
    if (remaining >= totalNeeded) {
      for (const wb of bucket) {
        const b = state.buildings.get(wb.id)!;
        b.workers = wb.needed;
        remaining -= wb.needed;
      }
    } else {
      // Distribute proportionally within this tier
      for (const wb of bucket) {
        const b = state.buildings.get(wb.id)!;
        const share = wb.needed / totalNeeded;
        const workers = Math.min(wb.needed, Math.floor(remaining * share));
        b.workers = workers;
      }
      remaining = 0;
    }
  }

  state.unemployed = Math.max(0, remaining);
}

/**
 * Consume cloth/tools for high-tier housing and run guild hall trade.
 */
export function updateGoodsAndTrade(state: CaesarState, dt: number): void {
  // Goods consumption for housing tiers (every tax interval)
  state.goodsConsumeTimer += dt;
  if (state.goodsConsumeTimer >= CB.TAX_INTERVAL) {
    state.goodsConsumeTimer -= CB.TAX_INTERVAL;
    consumeHousingGoods(state);
  }

  // Guild hall auto-trade: sell surplus tools/cloth for gold
  for (const b of state.buildings.values()) {
    if (!b.built || b.type !== CaesarBuildingType.GUILD_HALL) continue;
    if (!isBuildingRoadConnected(state, b)) continue;
    if (b.workers <= 0) continue;

    b.productionTimer += dt;
    if (b.productionTimer >= CB.TRADE_INTERVAL) {
      b.productionTimer -= CB.TRADE_INTERVAL;

      const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
      let goldGained = 0;

      // Sell surplus tools
      const tools = state.resources.get(CaesarResourceType.TOOLS) ?? 0;
      if (tools >= 3) {
        state.resources.set(CaesarResourceType.TOOLS, tools - 1);
        goldGained += CB.TRADE_GOLD_PER_TOOL;
      }

      // Sell surplus cloth
      const cloth = state.resources.get(CaesarResourceType.CLOTH) ?? 0;
      if (cloth >= 3) {
        state.resources.set(CaesarResourceType.CLOTH, cloth - 1);
        goldGained += CB.TRADE_GOLD_PER_CLOTH;
      }

      if (goldGained > 0) {
        state.resources.set(CaesarResourceType.GOLD, gold + goldGained);
      }
    }
  }
}
