// AI decision engine for world mode.
//
// Manages all AI cities, armies, and research in a single turn.
// Priority: defend threatened cities > build economy > recruit > expand > attack.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldArmy } from "@world/state/WorldArmy";
import {
  getAvailableBuildings,
  getRecruitableUnits,
  startConstruction,
  queueRecruitment,
  deployArmy,
  updateCityTerritory,
} from "@world/systems/CitySystem";
import { moveArmy } from "@world/systems/ArmySystem";
import {
  setActiveResearch,
  getPlayerAvailableResearch,
} from "@world/systems/ResearchSystem";
import { hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Execute a full AI turn for the given player. */
export function executeAITurn(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player || !player.isAI || !player.isAlive) return;

  // 1. Research — pick one if not active
  _handleResearch(player);

  // 2. City management — build and recruit
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    _manageCityBuilding(city, state);
    _manageCityRecruitment(city, state, player);
    updateCityTerritory(city, state);
  }

  // 3. Deploy garrison armies if they're strong enough
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    _tryDeployGarrison(city, state);
  }

  // 4. Move armies — attack nearest enemy or idle
  for (const army of state.armies.values()) {
    if (army.owner !== playerId || army.isGarrison) continue;
    _moveArmyAI(army, state);
  }
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

function _handleResearch(player: WorldPlayer): void {
  if (player.activeResearch) return;

  const available = getPlayerAvailableResearch(player);
  if (available.length === 0) return;

  // Prioritize: economic early, military mid/late
  const economic = available.filter((r) => r.branch === "economic");
  const military = available.filter((r) => r.branch === "military");
  const magic = available.filter((r) => r.branch === "magic");

  // Simple heuristic: economic first, then military, then magic
  const pick = economic[0] ?? military[0] ?? magic[0] ?? available[0];
  setActiveResearch(player, pick.id);
}

// ---------------------------------------------------------------------------
// City — building
// ---------------------------------------------------------------------------

function _manageCityBuilding(city: WorldCity, state: WorldState): void {
  if (city.constructionQueue || city.isUnderSiege) return;

  const available = getAvailableBuildings(city, state);
  if (available.length === 0) return;

  // Priority order for building
  const priorities = [
    "granary",
    "marketplace",
    "workshop",
    "barracks",
    "archery_range",
    "stables",
    "mage_tower",
    "city_walls",
    "library",
    "siege_workshop",
    "creature_den",
    "temple",
    "aqueduct",
    "military_academy",
  ];

  for (const pType of priorities) {
    const def = available.find((d) => d.type === pType);
    if (def) {
      startConstruction(city, def.type);
      return;
    }
  }

  // Build first available if nothing from priority list
  startConstruction(city, available[0].type);
}

// ---------------------------------------------------------------------------
// City — recruitment
// ---------------------------------------------------------------------------

function _manageCityRecruitment(
  city: WorldCity,
  state: WorldState,
  player: WorldPlayer,
): void {
  if (city.isUnderSiege) return;
  if (city.recruitmentQueue.length >= 2) return; // don't over-queue

  const units = getRecruitableUnits(city);
  if (units.length === 0) return;

  // Recruit a batch of the cheapest unit we can afford
  let bestType: string | null = null;
  let bestCost = Infinity;

  for (const unitType of units) {
    const def = UNIT_DEFINITIONS[unitType as keyof typeof UNIT_DEFINITIONS];
    if (def && def.cost < bestCost) {
      bestCost = def.cost;
      bestType = unitType;
    }
  }

  if (!bestType) return;

  // Recruit as many as we can afford, up to 5
  const maxCount = Math.min(5, Math.floor(player.gold / bestCost));
  if (maxCount >= 2) {
    queueRecruitment(city, state, bestType, maxCount);
  }
}

// ---------------------------------------------------------------------------
// Garrison deployment
// ---------------------------------------------------------------------------

function _tryDeployGarrison(city: WorldCity, state: WorldState): void {
  if (!city.garrisonArmyId) return;
  const garrison = state.armies.get(city.garrisonArmyId);
  if (!garrison || garrison.units.length === 0) return;

  // Only deploy if garrison has at least 8 units total
  let total = 0;
  for (const u of garrison.units) total += u.count;
  if (total < 8) return;

  // Deploy all units
  deployArmy(city, state, garrison.units.map((u) => ({ ...u })));
}

// ---------------------------------------------------------------------------
// Army movement
// ---------------------------------------------------------------------------

function _moveArmyAI(army: WorldArmy, state: WorldState): void {
  if (army.movementPoints <= 0) return;

  // Find nearest enemy city
  let nearestTarget: HexCoord | null = null;
  let nearestDist = Infinity;

  for (const city of state.cities.values()) {
    if (city.owner === army.owner) continue;
    const dist = hexDistance(army.position, city.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestTarget = city.position;
    }
  }

  // Also consider enemy armies
  for (const other of state.armies.values()) {
    if (other.owner === army.owner || other.isGarrison) continue;
    const dist = hexDistance(army.position, other.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestTarget = other.position;
    }
  }

  if (nearestTarget) {
    moveArmy(army, nearestTarget, state);
  }
}
