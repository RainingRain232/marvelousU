// ---------------------------------------------------------------------------
// Caesar – Rating system (Prosperity, Culture, Peace, Favor)
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";

export function updateRatings(state: CaesarState): void {
  updateProsperity(state);
  updateCulture(state);
  updatePeace(state);
  state.ratings.favor = Math.max(0, Math.min(100, state.ratings.favor));
}

/**
 * OVERHAULED Prosperity: rewards active economic management.
 * - Housing quality (20 pts): avg tier, but weighted by occupied housing only
 * - Employment (20 pts): employment rate matters
 * - Trade activity (20 pts): gold earned from caravan trades
 * - Goods production (20 pts): total goods produced over time
 * - Building variety (20 pts): variety of building types built
 */
function updateProsperity(state: CaesarState): void {
  if (state.population === 0) { state.ratings.prosperity = 0; return; }

  // Housing quality (0-20)
  let totalTier = 0, houses = 0;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built && b.residents > 0) {
      totalTier += b.housingTier; houses++;
    }
  }
  const avgTier = houses > 0 ? totalTier / houses : 0;
  const housingScore = (avgTier / 4) * 20;

  // Employment (0-20)
  const employRate = state.population > 0 ? 1 - (state.unemployed / state.population) : 0;
  const employScore = employRate * 20;

  // Trade activity (0-20): based on cumulative trade profit
  const tradeScore = Math.min(20, (state.tradeProfit / 2000) * 20);

  // Goods production (0-20): based on cumulative production output
  const goodsScore = Math.min(20, (state.goodsProduced / 500) * 20);

  // Building variety (0-20): how many distinct building types exist
  const builtTypes = new Set<string>();
  for (const b of state.buildings.values()) {
    if (b.built && b.type !== CaesarBuildingType.ROAD) builtTypes.add(b.type);
  }
  const varietyScore = Math.min(20, (builtTypes.size / 15) * 20); // 15 types = max

  const target = housingScore + employScore + tradeScore + goodsScore + varietyScore;
  state.ratings.prosperity += (target - state.ratings.prosperity) * 0.04;
  state.ratings.prosperity = Math.max(0, Math.min(100, state.ratings.prosperity));
}

/**
 * Culture: religion + entertainment coverage + building quality.
 */
function updateCulture(state: CaesarState): void {
  if (state.population === 0) { state.ratings.culture = 0; return; }

  let religionCount = 0, entertainmentCount = 0;
  let coveredHouses = 0, totalHouses = 0;
  let upgradedCulturalBuildings = 0;

  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (bdef.category === "religion") { religionCount++; if (b.level > 1) upgradedCulturalBuildings++; }
    if (bdef.category === "entertainment") { entertainmentCount++; if (b.level > 1) upgradedCulturalBuildings++; }
    if (b.type === CaesarBuildingType.HOUSING && b.residents > 0) {
      totalHouses++;
      // Require BOTH religion AND entertainment for full coverage credit
      if (b.services.has("religion") && b.services.has("entertainment")) coveredHouses += 1;
      else if (b.services.has("religion") || b.services.has("entertainment")) coveredHouses += 0.5;
    }
  }

  // Coverage (0-35): percentage of houses with religion+entertainment
  const coverageRate = totalHouses > 0 ? coveredHouses / totalHouses : 0;
  const coverageScore = coverageRate * 35;

  // Building count (0-30): more religion/entertainment buildings = higher culture
  const buildingScore = Math.min(30, religionCount * 7 + entertainmentCount * 5);

  // Building quality (0-15): upgraded cultural buildings
  const qualityScore = Math.min(15, upgradedCulturalBuildings * 5);

  // Morale bonus (0-20): happy people = more cultured
  const moraleBonus = Math.min(20, (state.morale / 100) * 20);

  const target = coverageScore + buildingScore + qualityScore + moraleBonus;
  state.ratings.culture += (target - state.ratings.culture) * 0.04;
  state.ratings.culture = Math.max(0, Math.min(100, state.ratings.culture));
}

/**
 * Peace: military readiness + raid defense + citizen safety.
 */
function updatePeace(state: CaesarState): void {
  let militaryBuildings = 0, walls = 0, towers = 0;
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type === CaesarBuildingType.WATCHPOST || b.type === CaesarBuildingType.BARRACKS) militaryBuildings++;
    if (b.type === CaesarBuildingType.WALL) walls++;
    if (b.type === CaesarBuildingType.TOWER) towers++;
  }

  let activeBandits = 0, fires = 0;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) activeBandits++;
  }
  for (const b of state.buildings.values()) {
    if (b.onFire) fires++;
  }

  // Military readiness (0-30)
  const milScore = Math.min(30, militaryBuildings * 8 + towers * 5 + walls);

  // Raid defense record (0-25)
  const defenseScore = Math.min(25, state.raidsDefeated * 4);

  // Active threats penalty (-0 to -50)
  const threatPenalty = activeBandits * 12 + fires * 5;

  // Base safety (from morale)
  const safetyBase = state.morale > 50 ? 15 : 5;

  const target = safetyBase + milScore + defenseScore - threatPenalty;
  state.ratings.peace += (target - state.ratings.peace) * 0.04;
  state.ratings.peace = Math.max(0, Math.min(100, state.ratings.peace));
}

export function checkVictory(state: CaesarState): boolean {
  if (state.population < state.goals.population) return false;
  if (state.ratings.prosperity < state.goals.prosperity) return false;
  if (state.ratings.culture < state.goals.culture) return false;
  if (state.ratings.peace < state.goals.peace) return false;
  if (state.ratings.favor < state.goals.favor) return false;
  return true;
}

export function checkDefeat(state: CaesarState): boolean {
  if (state.ratings.favor <= 0 && state.tributesMissed >= 3) return true;
  let hasHousing = false;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built) { hasHousing = true; break; }
  }
  if (!hasHousing && state.population === 0 && state.gameTick > 60 * CB.SIM_TPS) return true;
  return false;
}
