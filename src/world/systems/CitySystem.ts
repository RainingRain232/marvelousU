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
  WorldBuildingType,
  type WorldBuildingDef,
} from "@world/config/WorldBuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { filterInventoryByRace, getRace } from "@sim/config/RaceDefs";
import { BuildingType, UnitType } from "@/types";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { WorldBalance } from "@world/config/WorldConfig";
import { hexSpiral, hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { createWorldCity } from "@world/state/WorldCity";
import { hasResearch } from "@world/systems/ResearchSystem";
import { getLeader } from "@sim/config/LeaderDefs";
import type { ResourceType } from "@world/config/ResourceDefs";

// Strategic resources required by unit types
const UNIT_RESOURCE_REQUIREMENTS: Record<string, ResourceType> = {
  knight: "iron",
  pikeman: "iron",
  cavalry: "horses",
  horse_archer: "horses",
};

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/** Get buildings available for construction in this city. */
export function getAvailableBuildings(
  city: WorldCity,
  state: WorldState,
): WorldBuildingDef[] {
  const built = new Set<string>(city.buildings.map((b) => b.type));
  const queued = new Set<string>(city.constructionQueue.map((q) => q.buildingType));
  const player = state.players.get(city.owner);

  return getAllWorldBuildingDefs().filter((def) => {
    // Already built
    if (built.has(def.type)) return false;
    // Already in queue
    if (queued.has(def.type)) return false;
    // Research prerequisite check
    if (def.researchRequired && player && !hasResearch(player, def.researchRequired)) return false;
    // Round Table is Arthur-only and must be in capital
    if (def.type === WorldBuildingType.ROUND_TABLE) {
      if (!player || player.leaderId !== "arthur") return false;
      if (!city.isCapital) return false;
    }
    return true;
  });
}

/** Start constructing a building (adds to queue). */
export function startConstruction(
  city: WorldCity,
  buildingType: string,
): boolean {
  if (city.isUnderSiege) return false;

  const def = getWorldBuildingDef(buildingType);
  if (!def) return false;

  // Don't allow duplicates in queue
  if (city.constructionQueue.some((q) => q.buildingType === buildingType)) return false;

  city.constructionQueue.push({
    buildingType: buildingType as any,
    invested: 0,
    cost: def.productionCost,
  });

  return true;
}

/** Remove an item from the construction queue by index. */
export function cancelConstruction(city: WorldCity, index: number): boolean {
  if (index < 0 || index >= city.constructionQueue.length) return false;
  city.constructionQueue.splice(index, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Recruitment
// ---------------------------------------------------------------------------

/** Get all unit types available for recruitment in this city. */
export function getRecruitableUnits(
  city: WorldCity,
  state?: WorldState,
): string[] {
  const units: string[] = [];
  const player = state?.players.get(city.owner);
  const raceId = player?.raceId;

  // Castle always provides basic units + settlers
  units.push("swordsman", "archer", "settler");

  // Buildings unlock additional units
  for (const building of city.buildings) {
    const def = getWorldBuildingDef(building.type);
    if (!def) continue;

    let buildingUnits = [...def.unlocksUnits];

    // Faction Hall: populate from player's race faction units
    if (building.type === BuildingType.FACTION_HALL && raceId) {
      const race = getRace(raceId);
      if (race?.factionUnits) {
        buildingUnits = race.factionUnits.filter(
          (ut) => ut && UNIT_DEFINITIONS[ut],
        ) as string[];
      }
    }

    // Apply race-based tier filtering (e.g. Horde can't recruit mages)
    if (raceId) {
      buildingUnits = filterInventoryByRace(
        buildingUnits as UnitType[],
        building.type as BuildingType,
        raceId,
      ) as string[];
    }

    // Apply research-based tier gating
    if (player) {
      const maxTier = _getMaxRecruitableTier(building.type, player.completedResearch);
      buildingUnits = buildingUnits.filter((u) => {
        const def = UNIT_DEFINITIONS[u as keyof typeof UNIT_DEFINITIONS];
        return def ? (def.tier ?? 1) <= maxTier : true;
      });
    }

    for (const u of buildingUnits) {
      if (!units.includes(u)) units.push(u);
    }
  }

  // Filter by strategic resource requirements
  if (state) {
    const playerResources = _getPlayerResources(state, city.owner);
    return units.filter((u) => {
      const required = UNIT_RESOURCE_REQUIREMENTS[u];
      if (!required) return true; // no resource needed
      return playerResources.has(required);
    });
  }

  return units;
}

/** Get all resource types available in a player's city territories. */
function _getPlayerResources(state: WorldState, playerId: string): Set<ResourceType> {
  const resources = new Set<ResourceType>();
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const hex of city.workedTiles) {
      const tile = state.grid.getTile(hex.q, hex.r);
      if (tile?.resource) {
        resources.add(tile.resource);
      }
    }
  }
  return resources;
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

// ---------------------------------------------------------------------------
// Research-tier gating
// ---------------------------------------------------------------------------

/** Determine the maximum unit tier recruitable from a building based on completed research. */
function _getMaxRecruitableTier(buildingType: string, completedResearch: Set<string>): number {
  switch (buildingType) {
    case BuildingType.BARRACKS:
      if (completedResearch.has("legendary_arms")) return 7;
      if (completedResearch.has("adamantine_craft")) return 6;
      if (completedResearch.has("mithril_forging")) return 5;
      if (completedResearch.has("steel_working")) return 4;
      if (completedResearch.has("iron_working")) return 3;
      if (completedResearch.has("bronze_working")) return 2;
      return 1;
    case BuildingType.ARCHERY_RANGE:
      if (completedResearch.has("legendary_ranged")) return 7;
      if (completedResearch.has("master_archery")) return 5;
      if (completedResearch.has("expert_archery")) return 4;
      if (completedResearch.has("advanced_archery")) return 3;
      if (completedResearch.has("improved_bows")) return 2;
      return 1;
    case BuildingType.STABLES:
      if (completedResearch.has("legendary_cavalry")) return 7;
      if (completedResearch.has("heavy_cavalry")) return 5;
      if (completedResearch.has("cavalry_mastery")) return 4;
      if (completedResearch.has("cavalry_tactics")) return 3;
      return 2;
    case BuildingType.SIEGE_WORKSHOP:
      if (completedResearch.has("legendary_siege")) return 7;
      if (completedResearch.has("heavy_artillery")) return 5;
      if (completedResearch.has("advanced_siege")) return 4;
      if (completedResearch.has("siege_craft")) return 3;
      if (completedResearch.has("siege_engineering")) return 2;
      return 1;
    case BuildingType.MAGE_TOWER:
      if (completedResearch.has("archmage_arts")) return 7;
      if (completedResearch.has("high_sorcery")) return 6;
      if (completedResearch.has("conjuration")) return 4;
      if (completedResearch.has("arcane_study")) return 2;
      return 1;
    case BuildingType.CREATURE_DEN:
      if (completedResearch.has("archmage_arts")) return 7;
      if (completedResearch.has("high_sorcery")) return 6;
      if (completedResearch.has("conjuration")) return 4;
      if (completedResearch.has("arcane_study")) return 2;
      return 1;
    case BuildingType.TEMPLE:
      return 7;
    default:
      return 99;
  }
}
