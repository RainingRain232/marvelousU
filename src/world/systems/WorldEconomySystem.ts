// Per-turn resource collection for world mode.
//
// Each city collects yields from its worked tiles and applies building bonuses.
// Resources are added to the owning player's totals.

import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";
import { getWorldBuildingDef } from "@world/config/WorldBuildingDefs";
import { RESOURCE_DEFINITIONS, IMPROVEMENT_DEFINITIONS } from "@world/config/ResourceDefs";
import { getLeader } from "@sim/config/LeaderDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Process economy for all cities owned by the given player. */
export function processEconomy(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  const goldBefore = player.gold;

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;

    const yields = calculateCityYields(city, state);
    player.gold += yields.gold;
    player.food += yields.food;
    player.mana += yields.mana;

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

  // Morgaine crystal bonus: +10 mana and +10 research per crystal per turn
  if (player.morgaineCrystals > 0) {
    player.mana += player.morgaineCrystals * 10;
  }

  // Apply leader income_multiplier bonus to gold earned this turn
  if (player.leaderId) {
    const leaderDef = getLeader(player.leaderId);
    if (leaderDef?.bonus.type === "income_multiplier") {
      const earned = player.gold - goldBefore;
      if (earned > 0) {
        player.gold = goldBefore + Math.round(earned * leaderDef.bonus.multiplier);
      }
    }
  }

  // Army maintenance — scaled by unit cost (tier-based)
  let maintenance = 0;
  for (const army of state.armies.values()) {
    if (army.owner !== playerId) continue;
    for (const u of army.units) {
      const unitDef = UNIT_DEFINITIONS[u.unitType as keyof typeof UNIT_DEFINITIONS];
      // Maintenance = 1 per unit base + 1 per 50 gold cost (higher tier = more costly)
      const costTier = unitDef ? Math.ceil(unitDef.cost / 50) : 1;
      maintenance += u.count * Math.max(1, costTier);
    }
  }
  player.gold -= maintenance;
  if (player.gold < 0) player.gold = 0;
}

// ---------------------------------------------------------------------------
// Yield calculation
// ---------------------------------------------------------------------------

export interface CityYields {
  gold: number;
  food: number;
  production: number;
  mana: number;
  science: number;
}

/** Calculate per-turn yields for a city from worked tiles + buildings. */
export function calculateCityYields(
  city: WorldCity,
  state: WorldState,
): CityYields {
  let gold = WorldBalance.BASE_GOLD_INCOME;
  let food = 0;
  let production = WorldBalance.BASE_PRODUCTION;
  let mana = 0;
  let science = 0;

  // Tile yields
  for (const hex of city.workedTiles) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) continue;
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    gold += terrain.goldYield;
    food += terrain.foodYield;
    production += terrain.productionYield;

    // Resource bonus
    if (tile.resource) {
      const resDef = RESOURCE_DEFINITIONS[tile.resource];
      if (resDef) {
        gold += resDef.goldBonus;
        food += resDef.foodBonus;
        production += resDef.productionBonus;
      }
    }

    // Improvement bonus
    if (tile.improvement) {
      const impDef = IMPROVEMENT_DEFINITIONS[tile.improvement];
      if (impDef) {
        gold += impDef.goldBonus;
        food += impDef.foodBonus;
        production += impDef.productionBonus;
      }
    }
  }

  // Building bonuses
  for (const building of city.buildings) {
    const def = getWorldBuildingDef(building.type);
    if (def) {
      gold += def.goldBonus;
      food += def.foodBonus;
      production += def.productionBonus;
      mana += def.manaBonus;
      science += def.scienceBonus;
    }
  }

  return { gold, food, production, mana, science };
}
