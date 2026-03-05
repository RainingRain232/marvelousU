// Neutral city system for world mode.
//
// Handles army composition for neutral city garrisons and raider spawning.
// Neutral cities are independent city-states of random races. They field
// armies that include at least 20% faction hall units and the rest from
// the general unit pool filtered by race tiers.

import type { WorldState } from "@world/state/WorldState";
import { nextId } from "@world/state/WorldState";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { getRace, RACE_DEFINITIONS, filterInventoryByRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BuildingType, UnitType } from "@/types";
import { hexSpiral } from "@world/hex/HexCoord";
import { TerrainType } from "@world/config/TerrainDefs";

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
function getUnitsForRace(raceId: RaceId, maxTier: number): UnitType[] {
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
 * Generate a tier 1-2 raider army for a neutral city of the given race.
 * At least 20% of the army slots use faction hall units.
 */
export function getNeutralRaiderArmy(raceId: RaceId, rng: () => number): ArmyUnit[] {
  const race = getRace(raceId);
  if (!race) return [];

  const totalUnits = 5 + Math.floor(rng() * 4); // 5-8 total units
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

  // General pool units (80%) — tier 1-2 only
  const generalPool = getUnitsForRace(raceId, 2);
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
// Raider spawning (called every ~20 turns)
// ---------------------------------------------------------------------------

/**
 * Spawn raider armies from all neutral cities.
 * Called from the turn system when `state.turn % 20 === 0`.
 */
export function spawnNeutralRaiders(state: WorldState): void {
  for (const city of state.cities.values()) {
    // Only neutral cities (owner starts with "neutral_")
    if (!city.owner.startsWith("neutral_")) continue;

    const player = state.players.get(city.owner);
    if (!player || !player.isAlive) continue;

    const raceId = player.raceId;
    const rng = mulberry32(state.turn * 1000 + city.position.q * 31 + city.position.r * 17);

    // Find a valid spawn hex 3-5 tiles from the city
    const candidates = hexSpiral(city.position, 5)
      .filter((hex) => {
        const tile = state.grid.getTile(hex.q, hex.r);
        if (!tile) return false;
        if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) return false;
        if (tile.cityId || tile.armyId) return false;
        // Must be at least 3 away
        const dq = hex.q - city.position.q;
        const dr = hex.r - city.position.r;
        const ds = -dq - dr;
        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
        if (dist < 3) return false;
        return true;
      });

    if (candidates.length === 0) continue;
    const spawnHex = pickRandom(candidates, rng);

    // Create raider army
    const armyId = nextId(state, "army");
    const units = getNeutralRaiderArmy(raceId, rng);
    if (units.length === 0) continue;

    const army = createWorldArmy(armyId, city.owner, spawnHex, units, false);
    army.movementPoints = army.maxMovementPoints;
    state.armies.set(armyId, army);

    const tile = state.grid.getTile(spawnHex.q, spawnHex.r);
    if (tile) tile.armyId = armyId;
  }
}

/**
 * Pick a random race for a neutral city.
 */
export function pickNeutralRace(rng: () => number): RaceId {
  return pickRandom(NEUTRAL_RACES, rng);
}

export { mulberry32 as neutralRng };
