// AI decision engine for world mode.
//
// Evaluates strategic phase (EXPLORE → DEVELOP → ATTACK → DEFEND) and
// adjusts research, building, recruitment, and army movement accordingly.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
import {
  getAvailableBuildings,
  getRecruitableUnits,
  startConstruction,
  queueRecruitment,
  deployArmy,
  updateCityTerritory,
  canFoundCity,
  foundCity,
} from "@world/systems/CitySystem";
import { moveArmy } from "@world/systems/ArmySystem";
import {
  setActiveResearch,
  getPlayerAvailableResearch,
} from "@world/systems/ResearchSystem";
import { updateVisibility } from "@world/systems/FogOfWarSystem";
import { hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

type AIStrategy = "explore" | "develop" | "attack" | "defend";

function _evaluateStrategy(
  player: WorldPlayer,
  state: WorldState,
): AIStrategy {
  const playerId = player.id;

  // Count own and enemy forces
  let ownUnits = 0;
  let enemyUnitsNearby = 0;
  let ownArmies = 0;
  const ownCities: WorldCity[] = [];

  for (const army of state.armies.values()) {
    if (army.owner === playerId) {
      ownUnits += armyUnitCount(army);
      if (!army.isGarrison) ownArmies++;
    }
  }

  for (const city of state.cities.values()) {
    if (city.owner === playerId) {
      ownCities.push(city);
    }
  }

  // Check threats: enemy armies within 5 hexes of any city
  for (const city of ownCities) {
    for (const army of state.armies.values()) {
      if (army.owner === playerId || army.isGarrison) continue;
      if (hexDistance(army.position, city.position) <= 5) {
        enemyUnitsNearby += armyUnitCount(army);
      }
    }
  }

  // DEFEND if enemy army is near and stronger
  if (enemyUnitsNearby > ownUnits * 0.5 && enemyUnitsNearby > 5) {
    return "defend";
  }

  // EXPLORE early game (turn < 10 and few explored tiles)
  if (state.turn < 10 && player.exploredTiles.size < state.grid.size * 0.3) {
    return "explore";
  }

  // ATTACK if strong (> 15 units in field armies)
  if (ownUnits > 15 && ownArmies >= 1) {
    return "attack";
  }

  // Default: DEVELOP
  return "develop";
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Execute a full AI turn for the given player. */
export function executeAITurn(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player || !player.isAI || !player.isAlive) return;

  const strategy = _evaluateStrategy(player, state);

  // 1. Research
  _handleResearch(player, strategy);

  // 2. City management
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    _manageCityBuilding(city, state, strategy);
    _manageCityRecruitment(city, state, player, strategy);
    updateCityTerritory(city, state);
  }

  // 3. Deploy garrisons
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    _tryDeployGarrison(city, state, strategy);
  }

  // 4. Move armies (and found cities with settlers)
  for (const army of [...state.armies.values()]) {
    if (army.owner !== playerId || army.isGarrison) continue;

    // If army has a settler and can found, do it
    if (army.units.some((u) => u.unitType === "settler") && canFoundCity(army, state)) {
      foundCity(army, state);
      continue;
    }

    _moveArmyAI(army, state, player, strategy);

    // Check if we can found a city after moving
    if (state.armies.has(army.id) && army.units.some((u) => u.unitType === "settler") && canFoundCity(army, state)) {
      foundCity(army, state);
    }
  }

  // 5. Update fog of war
  updateVisibility(state, playerId);
}

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

function _handleResearch(player: WorldPlayer, strategy: AIStrategy): void {
  if (player.activeResearch) return;

  const available = getPlayerAvailableResearch(player);
  if (available.length === 0) return;

  const economic = available.filter((r) => r.branch === "economic");
  const military = available.filter((r) => r.branch === "military");
  const magic = available.filter((r) => r.branch === "magic");

  let pick;
  switch (strategy) {
    case "attack":
      pick = military[0] ?? magic[0] ?? economic[0];
      break;
    case "defend":
      pick = military[0] ?? economic[0] ?? magic[0];
      break;
    case "explore":
    case "develop":
    default:
      pick = economic[0] ?? military[0] ?? magic[0];
      break;
  }

  if (pick) setActiveResearch(player, pick.id);
}

// ---------------------------------------------------------------------------
// City — building
// ---------------------------------------------------------------------------

function _manageCityBuilding(
  city: WorldCity,
  state: WorldState,
  strategy: AIStrategy,
): void {
  if (city.constructionQueue || city.isUnderSiege) return;

  const available = getAvailableBuildings(city, state);
  if (available.length === 0) return;

  // Priority depends on strategy
  let priorities: string[];
  switch (strategy) {
    case "defend":
      priorities = [
        "city_walls", "barracks", "archery_range", "stables",
        "granary", "marketplace", "workshop",
      ];
      break;
    case "attack":
      priorities = [
        "barracks", "archery_range", "stables", "siege_workshop",
        "marketplace", "workshop", "military_academy",
      ];
      break;
    case "explore":
      priorities = [
        "granary", "marketplace", "barracks",
        "archery_range", "workshop",
      ];
      break;
    case "develop":
    default:
      priorities = [
        "granary", "marketplace", "workshop", "library",
        "barracks", "archery_range", "aqueduct",
        "city_walls", "temple",
      ];
      break;
  }

  for (const pType of priorities) {
    const def = available.find((d) => d.type === pType);
    if (def) {
      startConstruction(city, def.type);
      return;
    }
  }

  startConstruction(city, available[0].type);
}

// ---------------------------------------------------------------------------
// City — recruitment
// ---------------------------------------------------------------------------

function _manageCityRecruitment(
  city: WorldCity,
  state: WorldState,
  player: WorldPlayer,
  strategy: AIStrategy,
): void {
  if (city.isUnderSiege) return;
  if (city.recruitmentQueue.length >= 2) return;

  const units = getRecruitableUnits(city);
  if (units.length === 0) return;

  // Consider recruiting a settler if developing and have few cities
  if ((strategy === "develop" || strategy === "explore") && player.gold >= 300) {
    let ownCityCount = 0;
    for (const c of state.cities.values()) {
      if (c.owner === player.id) ownCityCount++;
    }
    // Only recruit settler if AI has fewer than 3 cities and no settler already in an army
    let hasSettler = false;
    for (const a of state.armies.values()) {
      if (a.owner === player.id && a.units.some((u) => u.unitType === "settler")) {
        hasSettler = true;
        break;
      }
    }
    if (ownCityCount < 3 && !hasSettler && units.includes("settler")) {
      queueRecruitment(city, state, "settler", 1);
      return;
    }
  }

  // Pick unit type based on strategy and variety
  const unitDefs = units.map((u) => ({
    type: u,
    def: UNIT_DEFINITIONS[u as keyof typeof UNIT_DEFINITIONS],
  })).filter((u) => u.def);

  if (unitDefs.length === 0) return;

  // Mix unit types: alternate between melee, ranged, cavalry
  const melee = unitDefs.filter((u) =>
    u.type === "swordsman" || u.type === "knight" || u.type === "pikeman",
  );
  const ranged = unitDefs.filter((u) =>
    u.type === "archer" || u.type === "crossbowman",
  );
  const cavalry = unitDefs.filter((u) =>
    u.type === "cavalry" || u.type === "horse_archer",
  );

  let pick;
  if (strategy === "attack" && cavalry.length > 0 && Math.random() < 0.3) {
    pick = cavalry[0];
  } else if (ranged.length > 0 && Math.random() < 0.4) {
    pick = ranged[0];
  } else if (melee.length > 0) {
    pick = melee[0];
  } else {
    pick = unitDefs[0];
  }

  // Scale recruitment by strategy
  const baseCount = strategy === "defend" ? 8 : strategy === "attack" ? 6 : 4;
  const maxCount = Math.min(baseCount, Math.floor(player.gold / pick.def!.cost));
  if (maxCount >= 1) {
    queueRecruitment(city, state, pick.type, maxCount);
  }
}

// ---------------------------------------------------------------------------
// Garrison deployment
// ---------------------------------------------------------------------------

function _tryDeployGarrison(
  city: WorldCity,
  state: WorldState,
  strategy: AIStrategy,
): void {
  if (!city.garrisonArmyId) return;
  const garrison = state.armies.get(city.garrisonArmyId);
  if (!garrison || garrison.units.length === 0) return;

  let total = 0;
  for (const u of garrison.units) total += u.count;

  // Keep more units garrisoned when defending
  const deployThreshold = strategy === "defend" ? 12 : strategy === "attack" ? 6 : 8;
  if (total < deployThreshold) return;

  // Don't deploy if enemy is very close when defending
  if (strategy === "defend") {
    for (const army of state.armies.values()) {
      if (army.owner === city.owner || army.isGarrison) continue;
      if (hexDistance(army.position, city.position) <= 3) return;
    }
  }

  deployArmy(city, state, garrison.units.map((u) => ({ ...u })));
}

// ---------------------------------------------------------------------------
// Army movement
// ---------------------------------------------------------------------------

function _moveArmyAI(
  army: WorldArmy,
  state: WorldState,
  _player: WorldPlayer,
  strategy: AIStrategy,
): void {
  if (army.movementPoints <= 0) return;

  const ownStrength = armyUnitCount(army);

  // Find targets
  let nearestCampTarget: HexCoord | null = null;
  let nearestCampDist = Infinity;
  let nearestCityTarget: HexCoord | null = null;
  let nearestCityDist = Infinity;
  let nearestEnemyTarget: HexCoord | null = null;
  let nearestEnemyDist = Infinity;
  let nearestEnemyStrength = 0;

  // Camps (only if exploring or developing)
  if (strategy === "explore" || strategy === "develop") {
    for (const camp of state.camps.values()) {
      if (camp.cleared) continue;
      const dist = hexDistance(army.position, camp.position);
      if (dist < nearestCampDist) {
        nearestCampDist = dist;
        nearestCampTarget = camp.position;
      }
    }
  }

  // Enemy cities
  for (const city of state.cities.values()) {
    if (city.owner === army.owner) continue;
    const dist = hexDistance(army.position, city.position);
    if (dist < nearestCityDist) {
      nearestCityDist = dist;
      nearestCityTarget = city.position;
    }
  }

  // Enemy armies
  for (const other of state.armies.values()) {
    if (other.owner === army.owner || other.isGarrison) continue;
    const dist = hexDistance(army.position, other.position);
    if (dist < nearestEnemyDist) {
      nearestEnemyDist = dist;
      nearestEnemyTarget = other.position;
      nearestEnemyStrength = armyUnitCount(other);
    }
  }

  // Retreat if weak and enemy is nearby
  if (
    strategy === "defend" &&
    nearestEnemyTarget &&
    nearestEnemyDist <= 3 &&
    nearestEnemyStrength > ownStrength * 1.5
  ) {
    // Retreat toward own city
    let bestCityDist = Infinity;
    let retreatTarget: HexCoord | null = null;
    for (const city of state.cities.values()) {
      if (city.owner !== army.owner) continue;
      const dist = hexDistance(army.position, city.position);
      if (dist < bestCityDist) {
        bestCityDist = dist;
        retreatTarget = city.position;
      }
    }
    if (retreatTarget) {
      moveArmy(army, retreatTarget, state);
      return;
    }
  }

  // Select target based on strategy
  let target: HexCoord | null = null;
  switch (strategy) {
    case "explore":
      // Prefer camps, then explore unexplored areas
      if (nearestCampTarget && nearestCampDist <= 8) {
        target = nearestCampTarget;
      } else if (nearestCampTarget) {
        target = nearestCampTarget;
      }
      break;

    case "develop":
      // Clear camps if nearby, otherwise hold position
      if (nearestCampTarget && nearestCampDist <= 5) {
        target = nearestCampTarget;
      }
      break;

    case "attack":
      // Prioritize nearby enemies, then cities
      if (nearestEnemyTarget && nearestEnemyDist <= 4) {
        target = nearestEnemyTarget;
      } else if (nearestCityTarget) {
        target = nearestCityTarget;
      }
      break;

    case "defend":
      // Attack nearby threats
      if (nearestEnemyTarget && nearestEnemyDist <= 4) {
        target = nearestEnemyTarget;
      }
      break;
  }

  if (target) {
    moveArmy(army, target, state);
  }
}
