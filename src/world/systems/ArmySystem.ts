// Army management for world mode.
//
// Handles movement, merge/split, and collision detection.

import type { WorldState, PendingBattle } from "@world/state/WorldState";
import { nextId } from "@world/state/WorldState";
import type { WorldArmy, ArmyUnit } from "@world/state/WorldArmy";
import { createWorldArmy } from "@world/state/WorldArmy";
import { hexKey, type HexCoord } from "@world/hex/HexCoord";
import { findHexPath, getReachableHexes } from "@world/hex/HexPathfinding";

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

/** Move an army toward a target hex. Returns true if any movement occurred. */
export function moveArmy(
  army: WorldArmy,
  target: HexCoord,
  state: WorldState,
): boolean {
  if (army.isGarrison) return false;
  if (army.movementPoints <= 0) return false;

  const path = findHexPath(state.grid, army.position, target, army.movementPoints);
  if (!path) return false;

  // Clear old tile's armyId
  const oldTile = state.grid.getTile(army.position.q, army.position.r);
  if (oldTile && oldTile.armyId === army.id) {
    oldTile.armyId = null;
  }

  // Move along path
  army.position = path.path[path.path.length - 1];
  army.movementPoints = path.remainingMP;
  army.path = null;

  // Set new tile's armyId
  const newTile = state.grid.getTile(army.position.q, army.position.r);
  if (newTile) {
    newTile.armyId = army.id;
  }

  return true;
}

/** Get all hexes reachable by an army this turn. */
export function getArmyReachableHexes(
  army: WorldArmy,
  state: WorldState,
): HexCoord[] {
  if (army.isGarrison) return [];
  const reachable = getReachableHexes(state.grid, army.position, army.movementPoints);
  return Array.from(reachable.keys())
    .map((k) => {
      const [q, r] = k.split(",").map(Number);
      return { q, r };
    });
}

// ---------------------------------------------------------------------------
// Merge / Split
// ---------------------------------------------------------------------------

/** Merge two friendly armies on the same hex. */
export function mergeArmies(
  army1: WorldArmy,
  army2: WorldArmy,
  state: WorldState,
): boolean {
  if (army1.owner !== army2.owner) return false;
  if (
    army1.position.q !== army2.position.q ||
    army1.position.r !== army2.position.r
  )
    return false;

  // Merge army2 into army1
  for (const stack of army2.units) {
    const existing = army1.units.find((u) => u.unitType === stack.unitType);
    if (existing) {
      existing.count += stack.count;
    } else {
      army1.units.push({ ...stack });
    }
  }

  // Remove army2
  const tile = state.grid.getTile(army2.position.q, army2.position.r);
  if (tile && tile.armyId === army2.id) {
    tile.armyId = army1.id;
  }
  state.armies.delete(army2.id);

  return true;
}

/** Split units from an army into a new army. */
export function splitArmy(
  source: WorldArmy,
  unitsToSplit: ArmyUnit[],
  state: WorldState,
): WorldArmy | null {
  if (source.isGarrison) return null;

  // Validate
  for (const stack of unitsToSplit) {
    const sStack = source.units.find((u) => u.unitType === stack.unitType);
    if (!sStack || sStack.count < stack.count) return null;
  }

  // Remove from source
  for (const stack of unitsToSplit) {
    const sStack = source.units.find((u) => u.unitType === stack.unitType)!;
    sStack.count -= stack.count;
  }
  source.units = source.units.filter((u) => u.count > 0);

  // Create new army
  const id = nextId(state, "army");
  const newArmy = createWorldArmy(
    id,
    source.owner,
    source.position,
    unitsToSplit,
    false,
  );
  newArmy.movementPoints = 0; // splitting costs all remaining MP
  state.armies.set(id, newArmy);

  return newArmy;
}

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------

/** Detect army collisions (enemy armies on the same hex). */
export function detectCollisions(state: WorldState): PendingBattle[] {
  const battles: PendingBattle[] = [];
  const checked = new Set<string>();

  for (const army of state.armies.values()) {
    if (army.isGarrison) continue;
    const key = hexKey(army.position.q, army.position.r);
    if (checked.has(key)) continue;
    checked.add(key);

    // Find all armies on this hex
    const armiesHere: WorldArmy[] = [];
    for (const other of state.armies.values()) {
      if (other.isGarrison) continue;
      if (
        other.position.q === army.position.q &&
        other.position.r === army.position.r
      ) {
        armiesHere.push(other);
      }
    }

    if (armiesHere.length < 2) continue;

    // Group by owner
    const byOwner = new Map<string, WorldArmy[]>();
    for (const a of armiesHere) {
      const list = byOwner.get(a.owner) ?? [];
      list.push(a);
      byOwner.set(a.owner, list);
    }

    if (byOwner.size < 2) continue; // all friendly

    // Create battle between first two hostile groups
    const owners = [...byOwner.keys()];
    const attacker = byOwner.get(owners[0])![0];
    const defender = byOwner.get(owners[1])![0];

    // Check if there's a city on this hex
    const tile = state.grid.getTile(army.position.q, army.position.r);
    const cityId = tile?.cityId ?? null;
    const isSiege = !!cityId;

    // Set siege flag on city
    if (isSiege && cityId) {
      const city = state.cities.get(cityId);
      if (city) city.isUnderSiege = true;
    }

    battles.push({
      type: isSiege ? "siege" : "field",
      attackerArmyId: attacker.id,
      defenderArmyId: defender.id,
      defenderCityId: cityId,
      hex: army.position,
    });
  }

  return battles;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/** Reset movement points for all armies of a player. */
export function resetArmyMovement(state: WorldState, playerId: string): void {
  for (const army of state.armies.values()) {
    if (army.owner === playerId && !army.isGarrison) {
      army.movementPoints = army.maxMovementPoints;
    }
  }
}
