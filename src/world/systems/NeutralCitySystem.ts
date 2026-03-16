// Neutral city system for world mode.
//
// Handles army composition for neutral city garrisons and raider spawning.
// Neutral cities are independent city-states of random races. They field
// armies that include at least 20% faction hall units and the rest from
// the general unit pool filtered by race tiers.
//
// Also handles:
// - Raider spawning every 5 turns (scaling strength with game turn)
// - Conquering neutral cities (battle → ownership transfer)
// - Allying with neutral cities via gold tribute
// - Allied cities provide trade income and stop spawning raiders

import type { WorldState } from "@world/state/WorldState";
import { nextId } from "@world/state/WorldState";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { getRace, RACE_DEFINITIONS, filterInventoryByRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BuildingType, UnitType } from "@/types";
import { hexSpiral, hexDistance } from "@world/hex/HexCoord";
import { TerrainType } from "@world/config/TerrainDefs";
import type { WorldCity } from "@world/state/WorldCity";

// ---------------------------------------------------------------------------
// Implemented races eligible for neutral cities
// ---------------------------------------------------------------------------

const NEUTRAL_RACES: RaceId[] = RACE_DEFINITIONS
  .filter((r) => r.implemented && r.id !== "op")
  .map((r) => r.id);

// ---------------------------------------------------------------------------
// Buildings whose inventories form the general unit pool
// ---------------------------------------------------------------------------

const POOL_BUILDINGS: BuildingType[] = [
  BuildingType.BARRACKS,
  BuildingType.ARCHERY_RANGE,
  BuildingType.STABLES,
  BuildingType.CREATURE_DEN,
  BuildingType.MAGE_TOWER,
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Turns between raider spawns from neutral cities. */
const RAIDER_SPAWN_INTERVAL = 5;

/** Base gold tribute cost to ally with a neutral city. */
const BASE_TRIBUTE_COST = 500;

/** Gold per turn from an allied neutral city. */
const ALLIED_TRADE_INCOME = 3;

/** Maximum distance raiders search for targets. */
const RAIDER_SEARCH_RADIUS = 8;

// ---------------------------------------------------------------------------
// Neutral city alliance tracking
// ---------------------------------------------------------------------------

/**
 * Map of neutral city IDs to the player ID they are allied with.
 * Allied neutral cities stop spawning raiders and provide trade income.
 */
const _alliedCities = new Map<string, string>();

/** Get the player a neutral city is allied with, or null. */
export function getNeutralCityAlly(cityId: string): string | null {
  return _alliedCities.get(cityId) ?? null;
}

/** Check if a neutral city is allied with any player. */
export function isNeutralCityAllied(cityId: string): boolean {
  return _alliedCities.has(cityId);
}

/** Get all neutral city IDs allied with a given player. */
export function getAlliedNeutralCities(playerId: string): string[] {
  const result: string[] = [];
  for (const [cityId, ally] of _alliedCities) {
    if (ally === playerId) result.push(cityId);
  }
  return result;
}

/** Clear all alliances (for game reset). */
export function clearNeutralAlliances(): void {
  _alliedCities.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple seeded RNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element from an array using the given RNG. */
function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Collect all unit types available to a race up to a given max tier.
 * Uses the race tier filtering system from RaceDefs.
 */
export function getUnitsForRace(raceId: RaceId, maxTier: number): UnitType[] {
  const seen = new Set<UnitType>();
  const result: UnitType[] = [];

  for (const bt of POOL_BUILDINGS) {
    const bDef = BUILDING_DEFINITIONS[bt];
    if (!bDef) continue;

    // Filter by race tiers
    const filtered = filterInventoryByRace(bDef.shopInventory, bt, raceId);

    for (const ut of filtered) {
      if (seen.has(ut)) continue;
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      const tier = uDef.tier ?? computeTier(uDef.cost);
      if (tier > maxTier) continue;
      // Skip special units
      if (uDef.siegeOnly || uDef.diplomatOnly) continue;
      if (ut === UnitType.SETTLER) continue;
      seen.add(ut);
      result.push(ut);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Army generation
// ---------------------------------------------------------------------------

/**
 * Generate a tier-3 garrison army for a neutral city of the given race.
 * At least 20% of the army slots use faction hall units.
 */
export function getNeutralCityGarrison(raceId: RaceId, rng: () => number): ArmyUnit[] {
  const race = getRace(raceId);
  if (!race) return [];

  const totalUnits = 12 + Math.floor(rng() * 5); // 12-16 total units
  const factionSlots = Math.max(1, Math.ceil(totalUnits * 0.2));
  const generalSlots = totalUnits - factionSlots;

  const units: ArmyUnit[] = [];

  // Faction hall units (20%+)
  const factionUnitTypes = race.factionUnits.filter((ut) => ut && UNIT_DEFINITIONS[ut]);
  if (factionUnitTypes.length > 0) {
    // Distribute faction slots among available faction unit types
    const perType = Math.ceil(factionSlots / factionUnitTypes.length);
    for (const fut of factionUnitTypes) {
      const count = Math.min(perType, factionSlots - units.reduce((s, u) => s + u.count, 0));
      if (count <= 0) break;
      const def = UNIT_DEFINITIONS[fut];
      units.push({ unitType: fut, count, hpPerUnit: def?.hp ?? 100 });
    }
  }

  // General pool units (80%) — tier 1-3, filtered by race
  const generalPool = getUnitsForRace(raceId, 3);
  if (generalPool.length > 0) {
    // Pick 3-5 different unit types from the pool
    const numTypes = Math.min(generalPool.length, 3 + Math.floor(rng() * 3));
    const shuffled = [...generalPool].sort(() => rng() - 0.5);
    const chosen = shuffled.slice(0, numTypes);

    let remaining = generalSlots;
    for (let i = 0; i < chosen.length && remaining > 0; i++) {
      const ut = chosen[i];
      const def = UNIT_DEFINITIONS[ut];
      // Last type gets all remaining, others get an even split with some variance
      const count = i === chosen.length - 1
        ? remaining
        : Math.max(1, Math.floor(remaining / (chosen.length - i) + (rng() - 0.5) * 2));
      remaining -= count;
      units.push({ unitType: ut, count, hpPerUnit: def?.hp ?? 100 });
    }
  }

  return units;
}

/**
 * Generate a raider army for a neutral city.
 * Raider strength scales with game turn:
 * - Turns 1-15: tier 1-2, 5-8 units (weak)
 * - Turns 16-40: tier 1-3, 8-12 units (moderate)
 * - Turns 41+: tier 1-3, 12-18 units (dangerous)
 * At least 20% of the army slots use faction hall units.
 */
export function getNeutralRaiderArmy(raceId: RaceId, rng: () => number, gameTurn: number = 1): ArmyUnit[] {
  const race = getRace(raceId);
  if (!race) return [];

  // Scale with game turn
  let maxTier: number;
  let minUnits: number;
  let maxUnits: number;

  if (gameTurn <= 15) {
    maxTier = 2;
    minUnits = 5;
    maxUnits = 8;
  } else if (gameTurn <= 40) {
    maxTier = 3;
    minUnits = 8;
    maxUnits = 12;
  } else {
    maxTier = 3;
    minUnits = 12;
    maxUnits = 18;
  }

  const totalUnits = minUnits + Math.floor(rng() * (maxUnits - minUnits + 1));
  const factionSlots = Math.max(1, Math.ceil(totalUnits * 0.2));
  const generalSlots = totalUnits - factionSlots;

  const units: ArmyUnit[] = [];

  // Faction hall units (20%+)
  const factionUnitTypes = race.factionUnits.filter((ut) => ut && UNIT_DEFINITIONS[ut]);
  if (factionUnitTypes.length > 0) {
    const fut = pickRandom(factionUnitTypes, rng);
    const def = UNIT_DEFINITIONS[fut];
    units.push({ unitType: fut, count: factionSlots, hpPerUnit: def?.hp ?? 100 });
  }

  // General pool units — tier filtered by game phase
  const generalPool = getUnitsForRace(raceId, maxTier);
  if (generalPool.length > 0) {
    const numTypes = Math.min(generalPool.length, 2 + Math.floor(rng() * 2));
    const shuffled = [...generalPool].sort(() => rng() - 0.5);
    const chosen = shuffled.slice(0, numTypes);

    let remaining = generalSlots;
    for (let i = 0; i < chosen.length && remaining > 0; i++) {
      const ut = chosen[i];
      const def = UNIT_DEFINITIONS[ut];
      const count = i === chosen.length - 1
        ? remaining
        : Math.max(1, Math.floor(remaining / (chosen.length - i) + (rng() - 0.5) * 2));
      remaining -= count;
      units.push({ unitType: ut, count, hpPerUnit: def?.hp ?? 100 });
    }
  }

  return units;
}

// ---------------------------------------------------------------------------
// Raider spawning (called every 5 turns)
// ---------------------------------------------------------------------------

/**
 * Spawn raider armies from all neutral cities.
 * Called from the turn system when `state.turn % 5 === 0`.
 * Raiders target the nearest player army or city within search radius.
 * Allied neutral cities do NOT spawn raiders.
 */
export function spawnNeutralRaiders(state: WorldState): void {
  for (const city of state.cities.values()) {
    // Only neutral cities (owner starts with "neutral_")
    if (!city.owner.startsWith("neutral_")) continue;

    // Allied neutral cities don't spawn raiders
    if (isNeutralCityAllied(city.id)) continue;

    const player = state.players.get(city.owner);
    if (!player || !player.isAlive) continue;

    const raceId = player.raceId;
    const rng = mulberry32(state.turn * 1000 + city.position.q * 31 + city.position.r * 17);

    // Find the nearest player target (army or city) to guide spawn direction
    let nearestTarget: { q: number; r: number } | null = null;
    let nearestDist = Infinity;

    for (const army of state.armies.values()) {
      if (army.owner.startsWith("neutral_")) continue;
      if (army.isGarrison) continue;
      const dist = hexDistance(city.position, army.position);
      if (dist < nearestDist && dist <= RAIDER_SEARCH_RADIUS) {
        nearestDist = dist;
        nearestTarget = army.position;
      }
    }

    for (const targetCity of state.cities.values()) {
      if (targetCity.owner.startsWith("neutral_")) continue;
      const dist = hexDistance(city.position, targetCity.position);
      if (dist < nearestDist && dist <= RAIDER_SEARCH_RADIUS) {
        nearestDist = dist;
        nearestTarget = targetCity.position;
      }
    }

    // Find a valid spawn hex 3-5 tiles from the city
    const candidates = hexSpiral(city.position, 5)
      .filter((hex) => {
        const tile = state.grid.getTile(hex.q, hex.r);
        if (!tile) return false;
        if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) return false;
        if (tile.cityId || tile.armyId) return false;
        // Must be at least 3 away
        const dist = hexDistance(hex, city.position);
        if (dist < 3) return false;
        return true;
      });

    if (candidates.length === 0) continue;

    // Prefer spawning toward nearest target
    let spawnHex: { q: number; r: number };
    if (nearestTarget && candidates.length > 1) {
      candidates.sort((a, b) => {
        const da = hexDistance(a, nearestTarget!);
        const db = hexDistance(b, nearestTarget!);
        return da - db;
      });
      // Pick from top 3 closest to target
      const top = candidates.slice(0, Math.min(3, candidates.length));
      spawnHex = pickRandom(top, rng);
    } else {
      spawnHex = pickRandom(candidates, rng);
    }

    // Create raider army with turn-scaled strength
    const armyId = nextId(state, "army");
    const units = getNeutralRaiderArmy(raceId, rng, state.turn);
    if (units.length === 0) continue;

    const army = createWorldArmy(armyId, city.owner, spawnHex, units, false);
    army.movementPoints = army.maxMovementPoints;
    state.armies.set(armyId, army);

    const tile = state.grid.getTile(spawnHex.q, spawnHex.r);
    if (tile) tile.armyId = armyId;
  }
}

// ---------------------------------------------------------------------------
// Conquering neutral cities
// ---------------------------------------------------------------------------

/**
 * Handle a neutral city being conquered after a siege battle is won.
 * The city transfers to the winning player's control.
 * Called from BattleResolver when a siege is won against a neutral city.
 */
export function conquerNeutralCity(
  state: WorldState,
  cityId: string,
  conquerorId: string,
): void {
  const city = state.cities.get(cityId);
  if (!city) return;

  const oldOwner = city.owner;
  if (!oldOwner.startsWith("neutral_")) return;

  // Transfer city ownership
  city.owner = conquerorId;
  city.isUnderSiege = false;

  // Remove any alliance
  _alliedCities.delete(cityId);

  // Transfer territory ownership
  for (const hex of city.territory) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (tile && tile.owner === oldOwner) {
      tile.owner = conquerorId;
    }
  }

  // Kill the neutral player if they have no more cities
  const neutralPlayer = state.players.get(oldOwner);
  if (neutralPlayer) {
    let hasCities = false;
    for (const c of state.cities.values()) {
      if (c.owner === oldOwner && c.id !== cityId) {
        hasCities = true;
        break;
      }
    }
    if (!hasCities) {
      neutralPlayer.isAlive = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Allying with neutral cities via tribute
// ---------------------------------------------------------------------------

/**
 * Calculate the gold tribute cost to ally with a neutral city.
 * Base cost is 500g, scales with city population.
 * Guinevere's Diplomacy ability halves the cost.
 */
export function getTributeCost(city: WorldCity, playerId: string, state: WorldState): number {
  let cost = BASE_TRIBUTE_COST + (city.population - 1) * 100;

  // Guinevere's Diplomacy: tribute costs halved
  const player = state.players.get(playerId);
  if (player?.leaderId === "guinevere") {
    cost = Math.floor(cost / 2);
  }

  return cost;
}

/**
 * Attempt to ally with a neutral city by paying gold tribute.
 * Returns a result message.
 */
export function payTributeToNeutralCity(
  state: WorldState,
  playerId: string,
  cityId: string,
): { success: boolean; message: string } {
  const city = state.cities.get(cityId);
  if (!city) return { success: false, message: "City not found." };

  if (!city.owner.startsWith("neutral_")) {
    return { success: false, message: "This is not a neutral city." };
  }

  if (isNeutralCityAllied(cityId)) {
    const existingAlly = getNeutralCityAlly(cityId);
    if (existingAlly === playerId) {
      return { success: false, message: "Already allied with this city." };
    }
    return { success: false, message: "This city is already allied with another player." };
  }

  const player = state.players.get(playerId);
  if (!player) return { success: false, message: "Invalid player." };

  const cost = getTributeCost(city, playerId, state);
  if (player.gold < cost) {
    return { success: false, message: `Not enough gold (need ${cost}g).` };
  }

  // Pay the tribute
  player.gold -= cost;

  // Establish alliance
  _alliedCities.set(cityId, playerId);

  // Set diplomacy to peace between the player and the neutral city owner
  const neutralPlayerId = city.owner;
  player.diplomacy.set(neutralPlayerId, "peace");
  const neutralPlayer = state.players.get(neutralPlayerId);
  if (neutralPlayer) {
    neutralPlayer.diplomacy.set(playerId, "peace");
  }

  return { success: true, message: `Alliance established with ${city.name} for ${cost}g!` };
}

/**
 * Collect trade income from allied neutral cities.
 * Called from WorldEconomySystem during economy processing.
 * Returns the total gold income from allied neutral cities.
 */
export function getAlliedCityTradeIncome(playerId: string, state: WorldState): number {
  let income = 0;
  for (const [cityId, ally] of _alliedCities) {
    if (ally !== playerId) continue;
    const city = state.cities.get(cityId);
    if (!city) continue;
    income += ALLIED_TRADE_INCOME;
  }
  return income;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Pick a random race for a neutral city.
 */
export function pickNeutralRace(rng: () => number): RaceId {
  return pickRandom(NEUTRAL_RACES, rng);
}

export { mulberry32 as neutralRng };
