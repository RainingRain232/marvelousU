// Per-turn resource collection for world mode.
//
// Each city collects yields from its worked tiles and applies building bonuses.
// Resources are added to the owning player's totals.

import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";
import { getWorldBuildingDef } from "@world/config/WorldBuildingDefs";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Process economy for all cities owned by the given player. */
export function processEconomy(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;

    const yields = calculateCityYields(city, state);
    player.gold += yields.gold;
    player.food += yields.food;

    // Food consumption
    const consumed = city.population * WorldBalance.FOOD_PER_POPULATION;
    player.food -= consumed;

    // If food goes negative, starvation (population loss)
    if (player.food < 0) {
      player.food = 0;
      if (city.population > 1) {
        city.population--;
      }
    }

    // Population growth check
    const growthThreshold =
      WorldBalance.FOOD_FOR_GROWTH_BASE +
      city.population * WorldBalance.FOOD_FOR_GROWTH_SCALE;

    city.foodStockpile += Math.max(0, yields.food - consumed);
    if (city.foodStockpile >= growthThreshold) {
      city.foodStockpile -= growthThreshold;
      city.population++;
    }
  }

  // Army maintenance — deduct gold per unit across all armies
  let totalUnits = 0;
  for (const army of state.armies.values()) {
    if (army.owner !== playerId) continue;
    for (const u of army.units) totalUnits += u.count;
  }
  player.gold -= totalUnits * WorldBalance.ARMY_MAINTENANCE_PER_UNIT;
  if (player.gold < 0) player.gold = 0;
}

// ---------------------------------------------------------------------------
// Yield calculation
// ---------------------------------------------------------------------------

export interface CityYields {
  gold: number;
  food: number;
  production: number;
}

/** Calculate per-turn yields for a city from worked tiles + buildings. */
export function calculateCityYields(
  city: WorldCity,
  state: WorldState,
): CityYields {
  let gold = WorldBalance.BASE_GOLD_INCOME;
  let food = 0;
  let production = WorldBalance.BASE_PRODUCTION;

  // Tile yields
  for (const hex of city.workedTiles) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) continue;
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    gold += terrain.goldYield;
    food += terrain.foodYield;
    production += terrain.productionYield;
  }

  // Building bonuses
  for (const building of city.buildings) {
    const def = getWorldBuildingDef(building.type);
    if (def) {
      gold += def.goldBonus;
      food += def.foodBonus;
      production += def.productionBonus;
    }
  }

  return { gold, food, production };
}
