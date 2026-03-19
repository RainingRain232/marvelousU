// ---------------------------------------------------------------------------
// Caesar – Rating system (Prosperity, Culture, Peace, Favor)
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, HOUSING_TIER_NAMES, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";

/**
 * Recalculate all ratings. Called once per second or so.
 */
export function updateRatings(state: CaesarState): void {
  updateProsperity(state);
  updateCulture(state);
  updatePeace(state);
  // Favor is updated by tribute system, but clamp it
  state.ratings.favor = Math.max(0, Math.min(100, state.ratings.favor));
}

function updateProsperity(state: CaesarState): void {
  if (state.population === 0) {
    state.ratings.prosperity = 0;
    return;
  }

  // Based on: average housing tier, gold reserves, employment
  let totalTier = 0;
  let houseCount = 0;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built && b.residents > 0) {
      totalTier += b.housingTier;
      houseCount++;
    }
  }

  const avgTier = houseCount > 0 ? totalTier / houseCount : 0;
  const tierScore = (avgTier / 4) * 50; // 0-50 from housing quality

  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  const goldScore = Math.min(25, (gold / 5000) * 25); // 0-25 from gold

  const employRate = state.population > 0
    ? 1 - (state.unemployed / state.population)
    : 0;
  const employScore = employRate * 25; // 0-25 from employment

  const target = tierScore + goldScore + employScore;
  // Smooth toward target
  state.ratings.prosperity += (target - state.ratings.prosperity) * 0.05;
  state.ratings.prosperity = Math.max(0, Math.min(100, state.ratings.prosperity));
}

function updateCulture(state: CaesarState): void {
  if (state.population === 0) {
    state.ratings.culture = 0;
    return;
  }

  // Based on: religion coverage, entertainment coverage, building variety
  let religionBuildings = 0;
  let entertainmentBuildings = 0;
  let coveredHouses = 0;
  let totalHouses = 0;

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (bdef.category === "religion") religionBuildings++;
    if (bdef.category === "entertainment") entertainmentBuildings++;
    if (b.type === CaesarBuildingType.HOUSING && b.residents > 0) {
      totalHouses++;
      if (b.services.has("religion") || b.services.has("entertainment")) {
        coveredHouses++;
      }
    }
  }

  const coverageRate = totalHouses > 0 ? coveredHouses / totalHouses : 0;
  const coverageScore = coverageRate * 50; // 0-50

  const buildingScore = Math.min(30, (religionBuildings * 8 + entertainmentBuildings * 6));
  const popScale = Math.min(20, (state.population / 200) * 20); // 0-20

  const target = coverageScore + buildingScore + popScale;
  state.ratings.culture += (target - state.ratings.culture) * 0.05;
  state.ratings.culture = Math.max(0, Math.min(100, state.ratings.culture));
}

function updatePeace(state: CaesarState): void {
  // Starts at 100, decreases during raids, increases with military
  let militaryBuildings = 0;
  let walls = 0;

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type === CaesarBuildingType.WATCHPOST || b.type === CaesarBuildingType.BARRACKS) {
      militaryBuildings++;
    }
    if (b.type === CaesarBuildingType.WALL || b.type === CaesarBuildingType.TOWER) {
      walls++;
    }
  }

  // Active bandits reduce peace
  let activeBandits = 0;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) activeBandits++;
  }

  const militaryScore = Math.min(40, militaryBuildings * 10 + walls * 2);
  const raidPenalty = activeBandits * 15;
  const defeatBonus = Math.min(20, state.raidsDefeated * 5);

  const target = 50 + militaryScore + defeatBonus - raidPenalty;
  state.ratings.peace += (target - state.ratings.peace) * 0.05;
  state.ratings.peace = Math.max(0, Math.min(100, state.ratings.peace));
}

/**
 * Check if all goals are met (victory condition).
 */
export function checkVictory(state: CaesarState): boolean {
  if (state.population < state.goals.population) return false;
  if (state.ratings.prosperity < state.goals.prosperity) return false;
  if (state.ratings.culture < state.goals.culture) return false;
  if (state.ratings.peace < state.goals.peace) return false;
  if (state.ratings.favor < state.goals.favor) return false;
  return true;
}

/**
 * Check if the player has lost (population 0 with no housing, or favor at 0).
 */
export function checkDefeat(state: CaesarState): boolean {
  if (state.ratings.favor <= 0 && state.tributesMissed >= 3) return true;
  // Check if player has any housing left
  let hasHousing = false;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built) {
      hasHousing = true;
      break;
    }
  }
  if (!hasHousing && state.population === 0 && state.gameTick > 60 * CB.SIM_TPS) return true;
  return false;
}
