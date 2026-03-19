// ---------------------------------------------------------------------------
// Caesar – Population / Immigration system
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS } from "../config/CaesarBalance";
import { CaesarBuildingType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";

/**
 * Handle immigration: new residents arrive if there's housing capacity and food.
 */
export function updateImmigration(state: CaesarState, dt: number): void {
  state.immigrantTimer -= dt;
  if (state.immigrantTimer > 0) return;

  const mod = DIFFICULTY_MODS[state.difficulty];
  state.immigrantTimer = CB.IMMIGRANT_INTERVAL;

  // Only immigrate if there's room and food
  if (state.population >= state.maxPopulation) return;
  if (state.population >= CB.MAX_POPULATION) return;

  const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
  if (food <= 0 && state.population > 0) return;

  // Attractiveness based on ratings
  const avgRating = (state.ratings.prosperity + state.ratings.culture +
                     state.ratings.peace + state.ratings.favor) / 4;
  const attractMult = Math.max(0.2, avgRating / 50);

  const immigrants = Math.floor(
    CB.IMMIGRANTS_PER_WAVE * attractMult * mod.immigrantMult
  );

  if (immigrants <= 0) return;

  // Fill housing with available capacity
  let remaining = immigrants;
  for (const b of state.buildings.values()) {
    if (remaining <= 0) break;
    if (b.type !== CaesarBuildingType.HOUSING || !b.built) continue;

    const capacity = CB.HOUSING_CAPACITY[b.housingTier];
    const space = capacity - b.residents;
    if (space <= 0) continue;

    const movedIn = Math.min(space, remaining);
    b.residents += movedIn;
    remaining -= movedIn;
  }

  const actualImmigrants = immigrants - remaining;
  state.population += actualImmigrants;
}
