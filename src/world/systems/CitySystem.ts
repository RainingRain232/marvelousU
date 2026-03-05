// City management system for world mode.
//
// Handles building construction, unit recruitment, territory, and growth.

import type { WorldState } from "@world/state/WorldState";
import { nextId } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { createWorldArmy } from "@world/state/WorldArmy";
import type { ArmyUnit } from "@world/state/WorldArmy";
import {
  getAllWorldBuildingDefs,
  getWorldBuildingDef,
  type WorldBuildingDef,
} from "@world/config/WorldBuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";
import { hexSpiral, hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { createWorldCity } from "@world/state/WorldCity";
import { hasResearch } from "@world/systems/ResearchSystem";
import { getLeader } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/** Get buildings available for construction in this city. */
export function getAvailableBuildings(
  city: WorldCity,
  state: WorldState,
): WorldBuildingDef[] {
  const built = new Set<string>(city.buildings.map((b) => b.type));
  const underConstruction = city.constructionQueue?.buildingType;
  const player = state.players.get(city.owner);

  return getAllWorldBuildingDefs().filter((def) => {
    // Already built
    if (built.has(def.type)) return false;
    // Currently building
    if (underConstruction === def.type) return false;
    // Research prerequisite check
    if (def.researchRequired && player && !hasResearch(player, def.researchRequired)) return false;
    return true;
  });
}

/** Start constructing a building. */
export function startConstruction(
  city: WorldCity,
  buildingType: string,
): boolean {
  if (city.constructionQueue) return false; // already building
  if (city.isUnderSiege) return false;

  const def = getWorldBuildingDef(buildingType);
  if (!def) return false;

  city.constructionQueue = {
    buildingType: buildingType as any,
    invested: 0,
    cost: def.productionCost,
  };

  return true;
}

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

/** Get all unit types available for recruitment in this city. */
export function getRecruitableUnits(
  city: WorldCity,
): string[] {
  const units: string[] = [];

  // Castle always provides basic units + settlers
  units.push("swordsman", "archer", "settler");

  // Buildings unlock additional units
  for (const building of city.buildings) {
    const def = getWorldBuildingDef(building.type);
    if (def) {
      for (const u of def.unlocksUnits) {
        if (!units.includes(u)) units.push(u);
      }
    }
  }

  return units;
}

/** Queue a batch of units for recruitment. Returns true if successful. */
export function queueRecruitment(
  city: WorldCity,
  state: WorldState,
  unitType: string,
  count: number,
): boolean {
  if (city.isUnderSiege) return false;
  if (count <= 0) return false;

  const unitDef = UNIT_DEFINITIONS[unitType as keyof typeof UNIT_DEFINITIONS];
  if (!unitDef) return false;

  // Settlers use a world-mode-specific cost
  const unitCost = unitType === "settler" ? WorldBalance.SETTLER_COST : unitDef.cost;
  const baseCost = unitCost * count;
  const player = state.players.get(city.owner);
  if (!player) return false;

  // Apply leader unit_cost_reduction bonus
  let costMultiplier = 1;
  if (player.leaderId) {
    const leaderDef = getLeader(player.leaderId);
    if (leaderDef?.bonus.type === "unit_cost_reduction") {
      costMultiplier = leaderDef.bonus.multiplier;
    }
  }
  const totalCost = Math.ceil(baseCost * costMultiplier);

  if (player.gold < totalCost) return false;
  player.gold -= totalCost;

  city.recruitmentQueue.push({
    unitType,
    count,
    goldCost: totalCost,
    turnsLeft: WorldBalance.RECRUITMENT_DELAY_TURNS,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Territory
// ---------------------------------------------------------------------------

/** Update a city's territory based on population. */
export function updateCityTerritory(
  city: WorldCity,
  state: WorldState,
): void {
  const radius =
    city.population >= WorldBalance.TERRITORY_EXPAND_POP
      ? WorldBalance.MAX_CITY_TERRITORY_RADIUS
      : WorldBalance.BASE_CITY_TERRITORY_RADIUS;

  const hexes = hexSpiral(city.position, radius);
  city.territory = hexes.filter((h) => state.grid.hasTile(h.q, h.r));

  // Mark ownership
  for (const hex of city.territory) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (tile && !tile.owner) {
      tile.owner = city.owner;
    }
  }

  // Update worked tiles (auto-assign best tiles up to population + 1)
  city.workedTiles = _autoAssignWorkedTiles(city, state);
}

/** Auto-assign the best tiles for a city to work. */
function _autoAssignWorkedTiles(
  city: WorldCity,
  state: WorldState,
): HexCoord[] {
  // Always work the city center
  const worked = [city.position];
  const maxWorked = city.population + 1; // city center + pop count

  if (maxWorked <= 1) return worked;

  // Score remaining territory tiles by yield value
  const scored = city.territory
    .filter(
      (h) => h.q !== city.position.q || h.r !== city.position.r,
    )
    .map((h) => {
      const tile = state.grid.getTile(h.q, h.r);
      if (!tile) return { hex: h, score: 0 };
      const t = TERRAIN_DEFINITIONS[tile.terrain];
      const score = (t.foodYield ?? 0) * 2 + (t.productionYield ?? 0) + (t.goldYield ?? 0);
      return { hex: h, score };
    })
    .sort((a, b) => b.score - a.score);

  for (let i = 0; i < Math.min(scored.length, maxWorked - 1); i++) {
    worked.push(scored[i].hex);
  }

  return worked;
}

// ---------------------------------------------------------------------------
// Garrison management
// ---------------------------------------------------------------------------

/** Deploy units from garrison to a new army on the map. */
export function deployArmy(
  city: WorldCity,
  state: WorldState,
  unitStacks: ArmyUnit[],
): string | null {
  if (unitStacks.length === 0) return null;

  const garrison = city.garrisonArmyId
    ? state.armies.get(city.garrisonArmyId)
    : null;
  if (!garrison) return null;

  // Validate garrison has enough units
  for (const stack of unitStacks) {
    const gStack = garrison.units.find((u) => u.unitType === stack.unitType);
    if (!gStack || gStack.count < stack.count) return null;
  }

  // Remove from garrison
  for (const stack of unitStacks) {
    const gStack = garrison.units.find((u) => u.unitType === stack.unitType)!;
    gStack.count -= stack.count;
  }
  garrison.units = garrison.units.filter((u) => u.count > 0);

  // Create new army on the map
  const armyId = nextId(state, "army");
  const army = createWorldArmy(armyId, city.owner, city.position, unitStacks, false);
  state.armies.set(armyId, army);

  // Place on grid
  const tile = state.grid.getTile(city.position.q, city.position.r);
  if (tile) tile.armyId = armyId;

  return armyId;
}

// ---------------------------------------------------------------------------
// City founding (settlers)
// ---------------------------------------------------------------------------

/** Check if an army can found a city at its current location. */
export function canFoundCity(
  army: import("@world/state/WorldArmy").WorldArmy,
  state: WorldState,
): boolean {
  if (army.isGarrison) return false;

  // Must have a settler unit
  if (!army.units.some((u) => u.unitType === "settler")) return false;

  const tile = state.grid.getTile(army.position.q, army.position.r);
  if (!tile) return false;

  // Must be on buildable terrain
  const terrain = TERRAIN_DEFINITIONS[tile.terrain];
  if (!terrain.buildable) return false;

  // Can't already have a city here
  if (tile.cityId) return false;

  // Minimum distance from other cities
  for (const city of state.cities.values()) {
    if (hexDistance(army.position, city.position) < WorldBalance.MIN_CITY_DISTANCE) {
      return false;
    }
  }

  return true;
}

/** Found a new city using a settler from the army. Returns the city ID or null. */
export function foundCity(
  army: import("@world/state/WorldArmy").WorldArmy,
  state: WorldState,
): string | null {
  if (!canFoundCity(army, state)) return null;

  // Remove the settler unit from the army
  const settlerStack = army.units.find((u) => u.unitType === "settler");
  if (!settlerStack) return null;
  settlerStack.count--;
  army.units = army.units.filter((u) => u.count > 0);

  // Create the city
  const cityId = nextId(state, "city");
  const city = createWorldCity(cityId, army.owner, army.position, false);

  // Assign territory
  const territoryHexes = hexSpiral(army.position, WorldBalance.BASE_CITY_TERRITORY_RADIUS);
  city.territory = territoryHexes.filter((h) => state.grid.hasTile(h.q, h.r));
  city.workedTiles = city.territory.slice(0, city.population + 1);

  // Mark tiles as owned
  for (const hex of city.territory) {
    const t = state.grid.getTile(hex.q, hex.r);
    if (t && !t.owner) {
      t.owner = army.owner;
    }
  }

  // Place city on grid
  const tile = state.grid.getTile(army.position.q, army.position.r)!;
  tile.cityId = cityId;
  state.cities.set(cityId, city);

  // If army has no more units, remove it
  if (army.units.length === 0) {
    if (tile.armyId === army.id) tile.armyId = null;
    state.armies.delete(army.id);
  }

  return cityId;
}
