// Queue processing, group spawning thresholds
import type { GameState } from "@sim/state/GameState";
import type { UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { createUnit } from "@sim/entities/Unit";
import { getBuilding } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";

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
          queue.readyUnits.push(front.unitType);
        }
      }

      // Deploy group when threshold is met
      if (queue.readyUnits.length >= queue.groupThreshold) {
        const spawnedIds: string[] = [];

        // Determine spawn position from the building's owner
        const owner = building.owner ?? "unknown";
        const spawnPos = { ...building.position };

        for (const unitType of queue.readyUnits) {
          const unit = createUnit({
            type: unitType,
            owner,
            position: spawnPos,
          });
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

        queue.readyUnits = [];
      }
    }
  },
};
