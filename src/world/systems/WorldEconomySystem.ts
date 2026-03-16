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
import { isCityCursed } from "@world/systems/OverlandSpellSystem";
import { getAlliedCityTradeIncome, getAlliedNeutralCities } from "@world/systems/NeutralCitySystem";
import { hexDistance, hexNeighbors } from "@world/hex/HexCoord";
import { TerrainType } from "@world/config/TerrainDefs";
import { LUXURY_RESOURCE_TYPES, type LuxuryResourceType } from "@world/config/ResourceDefs";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Process economy for all cities owned by the given player. */
export function processEconomy(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  const goldBefore = player.gold;
  const leaderDef = player.leaderId ? getLeader(player.leaderId) : null;
  const leaderAbilityId = leaderDef?.leaderAbility?.id ?? null;

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;

    const yields = calculateCityYields(city, state);

    // Galahad — Divine Providence: +1 food and +1 gold per completed building
    if (leaderAbilityId === "divine_providence") {
      const buildingCount = city.buildings.length;
      yields.gold += buildingCount;
      yields.food += buildingCount;
    }

    // Nimue — Lake's Blessing: cities adjacent to water get +2 mana/turn, +1 food/turn
    if (leaderAbilityId === "lake_blessing") {
      const neighbors = hexNeighbors(city.position);
      for (const n of neighbors) {
        const tile = state.grid.getTile(n.q, n.r);
        if (tile && tile.terrain === TerrainType.WATER) {
          yields.mana += 2;
          yields.food += 1;
          break; // Only apply once per city regardless of number of water tiles
        }
      }
    }

    // Luxury resource bonuses: cities with luxury access get +2 happiness (food proxy), +1 gold
    const luxuryBonus = getCityLuxuryBonus(city, state);
    yields.gold += luxuryBonus.gold;
    yields.food += luxuryBonus.food;

    player.gold += yields.gold;
    player.mana += yields.mana;

    // Diminishing returns on food based on city population
    let effectiveFood = yields.food;
    if (city.population > 10) {
      effectiveFood = Math.floor(effectiveFood * 0.6);
    } else if (city.population > 5) {
      effectiveFood = Math.floor(effectiveFood * 0.8);
    }
    player.food += effectiveFood;

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

    city.foodStockpile += Math.max(0, effectiveFood - consumed);
    if (city.foodStockpile >= growthThreshold) {
      city.foodStockpile -= growthThreshold;
      city.population++;
    }
  }

  // Income from captured neutral buildings
  for (const nb of state.neutralBuildings.values()) {
    if (nb.owner === playerId && nb.captured) {
      player.gold += nb.goldIncome;
      player.mana += nb.manaIncome;
    }
  }

  // Trade income from allied neutral cities (+3 gold/turn each)
  player.gold += getAlliedCityTradeIncome(playerId, state);

  // Arthur — Round Table: allied neutral cities within 3 hexes of owned cities get +2 gold/turn
  if (leaderAbilityId === "round_table") {
    const alliedCityIds = getAlliedNeutralCities(playerId);
    for (const alliedId of alliedCityIds) {
      const alliedCity = state.cities.get(alliedId);
      if (!alliedCity) continue;
      for (const ownedCity of state.cities.values()) {
        if (ownedCity.owner !== playerId) continue;
        if (ownedCity.owner.startsWith("neutral_")) continue;
        if (hexDistance(ownedCity.position, alliedCity.position) <= 3) {
          player.gold += 2;
          break; // Only count once per allied city
        }
      }
    }
  }

  // Morgaine crystal bonus: +10 mana and +10 research per crystal per turn
  if (player.morgaineCrystals > 0) {
    player.mana += player.morgaineCrystals * 10;
  }

  // Merlin — Arcane Supremacy: +25% mana income
  if (leaderAbilityId === "arcane_supremacy") {
    const manaEarned = player.mana; // total mana at this point
    // Apply 25% bonus to mana earned this turn only (approximate)
    const manaThisTurn = manaEarned; // since mana was 0-based from processOverlandSpells
    if (manaThisTurn > 0) {
      player.mana += Math.floor(manaThisTurn * 0.25);
    }
  }

  // Apply leader income_multiplier bonus to gold earned this turn
  if (leaderDef?.bonus.type === "income_multiplier") {
    const earned = player.gold - goldBefore;
    if (earned > 0) {
      player.gold = goldBefore + Math.round(earned * leaderDef.bonus.multiplier);
    }
  }

  // Army maintenance — scaled by unit cost (tier-based)
  let maintenance = 0;
  let totalArmyCount = 0;
  for (const army of state.armies.values()) {
    if (army.owner !== playerId) continue;
    if (!army.isGarrison) totalArmyCount++;
    for (const u of army.units) {
      const unitDef = UNIT_DEFINITIONS[u.unitType as keyof typeof UNIT_DEFINITIONS];
      // Maintenance = 1 per unit base + 1 per 50 gold cost (higher tier = more costly)
      const costTier = unitDef ? Math.ceil(unitDef.cost / 50) : 1;
      maintenance += u.count * Math.max(1, costTier);
    }
  }

  // Scaling army count penalty: 3+ armies cost 20% more per additional army
  if (totalArmyCount >= 3) {
    const extraArmies = totalArmyCount - 2;
    const scalingMultiplier = 1 + extraArmies * 0.2;
    maintenance = Math.ceil(maintenance * scalingMultiplier);
  }

  // Kay — Efficient Steward: 25% maintenance reduction
  if (leaderAbilityId === "efficient_steward") {
    maintenance = Math.floor(maintenance * 0.75);
  }

  player.gold -= maintenance;
  if (player.gold < 0) player.gold = 0;
}

// ---------------------------------------------------------------------------
// Luxury resource bonus
// ---------------------------------------------------------------------------

/** Calculate bonus gold and food from luxury resources within a city's territory. */
function getCityLuxuryBonus(
  city: WorldCity,
  state: WorldState,
): { gold: number; food: number } {
  let gold = 0;
  let food = 0;
  const seenLuxuries = new Set<LuxuryResourceType>();

  for (const hex of city.workedTiles) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile || !tile.resource) continue;
    if (LUXURY_RESOURCE_TYPES.includes(tile.resource as LuxuryResourceType)) {
      const luxury = tile.resource as LuxuryResourceType;
      if (!seenLuxuries.has(luxury)) {
        seenLuxuries.add(luxury);
        gold += 1; // +1 gold per unique luxury
        food += 2; // +2 happiness (represented as food) per unique luxury
      }
    }
  }

  return { gold, food };
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

  // Apply overland spell curses
  if (isCityCursed(state, city.id, "famine")) {
    food = 0; // No food production during famine
  }
  if (isCityCursed(state, city.id, "corruption")) {
    // Corruption: tiles produce nothing — zero out tile yields
    gold = WorldBalance.BASE_GOLD_INCOME;
    food = 0;
    production = WorldBalance.BASE_PRODUCTION;
  }

  // Apply Prosperity bonus (caster's cities get +3 gold)
  const owner = state.players.get(city.owner);
  if (owner?.activeSpells.has("prosperity")) {
    gold += 3;
  }
  // Apply Fertility bonus (caster's cities get +50% food)
  if (owner?.activeSpells.has("fertility")) {
    food = Math.floor(food * 1.5);
  }
  // Apply Channel Surge (double mana)
  if (owner?.activeSpells.has("channel_surge")) {
    mana *= 2;
  }

  return { gold, food, production, mana, science };
}
