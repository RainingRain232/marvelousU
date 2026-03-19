// ---------------------------------------------------------------------------
// Caesar – Morale system: population happiness affects productivity/emigration
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";

/**
 * Update population morale based on conditions.
 * Low morale causes emigration and slows production.
 */
export function updateMorale(state: CaesarState, dt: number): void {
  if (state.population === 0) { state.morale = CB.MORALE_BASE; return; }

  let target = CB.MORALE_BASE;

  // Food situation
  const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
  if (food > 50) target += CB.MORALE_FOOD_BONUS;
  else if (food <= 0) target += CB.MORALE_FOOD_PENALTY;

  // Unemployment
  if (state.population > 10 && state.unemployed > state.population * 0.4) {
    target += CB.MORALE_UNEMPLOYMENT_PENALTY;
  }

  // Missed tributes (king's displeasure trickles down)
  target += state.tributesMissed * CB.MORALE_TAX_PENALTY;

  // Active raid
  let hasRaid = false;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) { hasRaid = true; break; }
  }
  if (hasRaid) target += CB.MORALE_RAID_PENALTY;

  // Entertainment and religion coverage boost
  let entertainedHouses = 0;
  let religiousHouses = 0;
  let totalHouses = 0;
  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING || !b.built || b.residents === 0) continue;
    totalHouses++;
    if (b.services.has("entertainment")) entertainedHouses++;
    if (b.services.has("religion")) religiousHouses++;
  }
  if (totalHouses > 0) {
    if (entertainedHouses / totalHouses > 0.5) target += CB.MORALE_ENTERTAINMENT_BONUS;
    if (religiousHouses / totalHouses > 0.5) target += CB.MORALE_RELIGION_BONUS;
  }

  // Active fires reduce morale
  let fireCount = 0;
  for (const b of state.buildings.values()) {
    if (b.onFire) fireCount++;
  }
  target -= fireCount * 5;

  // Clamp target
  target = Math.max(0, Math.min(100, target));

  // Smooth toward target
  state.morale += (target - state.morale) * 0.02;
  state.morale = Math.max(0, Math.min(100, state.morale));

  // Low morale effects
  if (state.morale < 30) {
    // People leave
    const leaving = CB.LOW_MORALE_EMIGRATION * dt;
    if (leaving >= 1 || Math.random() < (leaving % 1)) {
      let toRemove = Math.floor(leaving) || 1;
      for (const b of state.buildings.values()) {
        if (toRemove <= 0) break;
        if (b.type !== CaesarBuildingType.HOUSING || b.residents <= 0) continue;
        const remove = Math.min(b.residents, toRemove);
        b.residents -= remove;
        toRemove -= remove;
      }
      state.population = Math.max(0, state.population - (Math.floor(leaving) || 1));
    }
  }
}

/**
 * Get production speed multiplier from morale.
 */
export function getMoraleProductionMult(state: CaesarState): number {
  if (state.morale < 40) return CB.LOW_MORALE_PROD_MULT;
  if (state.morale > 80) return 1.1; // High morale bonus
  return 1;
}
