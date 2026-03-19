// ---------------------------------------------------------------------------
// Caesar – Economy: taxes, tribute, expenses
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";

/**
 * Collect taxes from housing based on tier and population.
 */
export function updateTaxes(state: CaesarState, dt: number): void {
  state.taxTimer += dt;
  if (state.taxTimer < CB.TAX_INTERVAL) return;
  state.taxTimer -= CB.TAX_INTERVAL;

  const mod = DIFFICULTY_MODS[state.difficulty];
  let totalTax = 0;

  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING) continue;
    if (!b.built || b.residents === 0) continue;

    const taxPerPerson = CB.HOUSING_TAX_PER_PERSON[b.housingTier] * mod.taxMult;
    totalTax += b.residents * taxPerPerson;
  }

  totalTax = Math.floor(totalTax);
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold + totalTax);
  state.monthlyIncome = totalTax;
}

/**
 * Handle King's tribute demands.
 */
export function updateTribute(state: CaesarState, dt: number): void {
  const mod = DIFFICULTY_MODS[state.difficulty];
  state.tributeTimer -= dt;

  if (state.tributeTimer <= 0) {
    state.tributeTimer = CB.TRIBUTE_INTERVAL;

    const tributeAmount = Math.floor(CB.TRIBUTE_AMOUNT * mod.tributeMult);
    const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;

    if (gold >= tributeAmount) {
      // Pay tribute
      state.resources.set(CaesarResourceType.GOLD, gold - tributeAmount);
      state.tributesPaid++;
      state.ratings.favor = Math.min(100, state.ratings.favor + CB.FAVOR_PER_TRIBUTE);
    } else {
      // Can't pay — favor drops
      state.tributesMissed++;
      state.ratings.favor = Math.max(0, state.ratings.favor + CB.FAVOR_PENALTY);
    }
  }
}

/**
 * Track food consumption by population.
 * Population consumes food over time. If food runs out, people leave.
 */
export function updateFoodConsumption(state: CaesarState, dt: number): void {
  if (state.population === 0) return;

  // 1 food per 10 people per tax interval
  const foodPerInterval = Math.ceil(state.population / 10);
  const foodConsumedPerSec = foodPerInterval / CB.TAX_INTERVAL;
  const consumed = foodConsumedPerSec * dt;

  const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
  if (food > 0) {
    state.resources.set(CaesarResourceType.FOOD, Math.max(0, food - consumed));
  } else {
    // No food — people start leaving (1 per second)
    const leaving = Math.min(state.population, Math.ceil(dt));
    if (leaving > 0) {
      // Remove from random housing
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
 * Calculate employment: assign workers to buildings.
 */
export function updateEmployment(state: CaesarState): void {
  let totalWorkers = 0;
  let totalJobs = 0;

  // Count total jobs available
  const workBuildings: { id: number; needed: number }[] = [];
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type === CaesarBuildingType.HOUSING || b.type === CaesarBuildingType.ROAD ||
        b.type === CaesarBuildingType.WALL || b.type === CaesarBuildingType.GATE) continue;

    const { maxWorkers } = CAESAR_BUILDING_DEFS[b.type];
    if (maxWorkers > 0) {
      workBuildings.push({ id: b.id, needed: maxWorkers });
      totalJobs += maxWorkers;
    }
  }

  // Available workers = population
  const availableWorkers = state.population;

  // Distribute workers proportionally
  let assigned = 0;
  for (const wb of workBuildings) {
    const b = state.buildings.get(wb.id)!;
    if (availableWorkers <= 0) {
      b.workers = 0;
      continue;
    }
    const share = totalJobs > 0 ? wb.needed / totalJobs : 0;
    const workers = Math.min(wb.needed, Math.floor(availableWorkers * share));
    b.workers = workers;
    assigned += workers;
  }

  state.unemployed = Math.max(0, availableWorkers - assigned);
}
