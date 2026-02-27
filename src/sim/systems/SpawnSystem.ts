// Queue processing, group spawning thresholds
import type { GameState } from "@sim/state/GameState";
import { BuildingType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Building } from "@sim/entities/Building";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { createUnit } from "@sim/entities/Unit";
import { getBuilding } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { getLeader } from "@sim/config/LeaderDefs";
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enqueue a unit to be trained at the given building.
 * The spawn timer is taken from the unit's definition `spawnTime`.
 */
export function addToQueue(
  state: GameState,
  buildingId: string,
  unitType: UnitType,
): void {
  const building = getBuilding(state, buildingId);
  const def = UNIT_DEFINITIONS[unitType];
  
  // Check unit max count limit
  if (def.maxCount !== undefined && building.owner) {
    const owned = _countOwnedUnits(state, building.owner, unitType);
    if (owned >= def.maxCount) {
      return; // Silently fail if max count reached
    }
  }
  
  building.spawnQueue.entries.push({
    unitType,
    remainingTime: def.spawnTime,
  });
}

/**
 * Tick all spawn queues forward by `dt` seconds.
 *
 * For each building:
 *   1. Decrement the front entry's remainingTime.
 *   2. When it reaches 0, move it to `readyUnits`.
 *   3. When `readyUnits.length >= groupThreshold`, deploy the group:
 *      - Create Unit entities in `state.units`.
 *      - Emit `unitSpawned` for each, then `groupSpawned` for the batch.
 *      - Clear `readyUnits`.
 */
export const SpawnSystem = {
  update(state: GameState, dt: number): void {
    for (const building of state.buildings.values()) {
      const queue = building.spawnQueue;

      // Tick the front entry only (sequential training)
      if (queue.entries.length > 0) {
        const front = queue.entries[0];
        front.remainingTime -= dt;

        if (front.remainingTime <= 0) {
          queue.entries.shift();
          if (queue.queueEnabled) {
            // Queue mode: accumulate until group threshold
            queue.readyUnits.push(front.unitType);
          } else {
            // Instant mode: spawn immediately
            _spawnUnits(state, building, [front.unitType]);
          }
        }
      }

      // Queue mode: deploy group when threshold is met
      if (queue.queueEnabled && queue.readyUnits.length >= queue.groupThreshold) {
        _spawnUnits(state, building, queue.readyUnits);
        queue.readyUnits = [];
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _spawnUnits(
  state: GameState,
  building: Building,
  unitTypes: UnitType[],
): void {
  const owner = building.owner ?? "unknown";
  const spawnPos = { ...building.position };
  const spawnedIds: string[] = [];

  const isCastle = building.type === BuildingType.CASTLE;

  // Determine if this owner has a leader bonus that grants starting levels
  const startingLevel = _leaderStartingLevel(state, owner, building.type);

  for (const unitType of unitTypes) {
    const unit = createUnit({ type: unitType, owner, position: spawnPos });

    // Apply all purchased upgrades to the new unit
    UpgradeSystem.applyAllUpgradesToUnit(unit);

    // Castle-spawned units become homeguard — they patrol near home
    if (isCastle) {
      unit.homeguard = true;
      unit.homeguardOrigin = { ...building.position };
    }

    // Apply leader starting-level bonus
    if (startingLevel > 0) {
      unit.level = startingLevel;
    }

    state.units.set(unit.id, unit);
    spawnedIds.push(unit.id);
    EventBus.emit("unitSpawned", {
      unitId: unit.id,
      buildingId: building.id,
      position: { ...spawnPos },
    });
  }

  EventBus.emit("groupSpawned", {
    unitIds: spawnedIds,
    buildingId: building.id,
  });
}

/**
 * Returns the starting level that a leader grants for units spawned from
 * the given building by the given owner. Returns 0 if no bonus applies.
 */
function _leaderStartingLevel(
  state: GameState,
  owner: string,
  buildingType: BuildingType,
): number {
  // Only P1 has a leader for now
  if (owner !== "p1" || !state.p1LeaderId) return 0;

  const leader = getLeader(state.p1LeaderId);
  if (!leader) return 0;

  const bonus = leader.bonus;
  if (bonus.type === "unit_start_level" && bonus.unitSource === "stables") {
    if (buildingType === BuildingType.STABLES) return bonus.level;
  }
  if (bonus.type === "unit_start_level_building") {
    if (buildingType === bonus.building) return bonus.level;
  }
  return 0;
}

/**
 * Count how many living units of a specific type a player currently owns.
 */
function _countOwnedUnits(
  state: GameState,
  owner: string,
  unitType: UnitType,
): number {
  let count = 0;
  for (const unit of state.units.values()) {
    if (unit.owner === owner && unit.type === unitType && unit.state !== UnitState.DIE) {
      count++;
    }
  }
  return count;
}
