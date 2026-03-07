// RTS construction system — workers build buildings over time.
// Buildings in CONSTRUCTION state have their progress incremented by nearby workers.

import type { GameState } from "@sim/state/GameState";
import { BuildingState, GameMode, UnitState } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { EventBus } from "@sim/core/EventBus";

const CONSTRUCTION_RANGE_SQ = 9; // 3 tiles — workers must be within this to build

export const ConstructionSystem = {
  update(state: GameState, dt: number): void {
    if (state.gameMode !== GameMode.RTS) return;

    for (const building of state.buildings.values()) {
      if (building.state !== BuildingState.CONSTRUCTION) continue;

      // Count workers at the building site
      let workerCount = 0;
      for (const workerId of building.constructionWorkerIds) {
        const worker = state.units.get(workerId);
        if (!worker || worker.state === UnitState.DIE) continue;
        const dsq = distanceSq(worker.position, building.position);
        if (dsq <= CONSTRUCTION_RANGE_SQ) {
          workerCount++;
        }
      }

      if (workerCount === 0) continue;

      // Progress construction (more workers = faster, with diminishing returns)
      const speedMultiplier = 1 + (workerCount - 1) * 0.5; // 1 worker=1x, 2=1.5x, 3=2x
      building.constructionProgress += dt * speedMultiplier;

      // Scale health with progress
      if (building.buildTime > 0) {
        const ratio = Math.min(building.constructionProgress / building.buildTime, 1);
        building.health = Math.floor(building.maxHealth * ratio);
      }

      EventBus.emit("constructionProgress", {
        buildingId: building.id,
        progress: building.buildTime > 0
          ? building.constructionProgress / building.buildTime
          : 1,
      });

      // Check completion
      if (building.constructionProgress >= building.buildTime) {
        building.state = BuildingState.ACTIVE;
        building.health = building.maxHealth;
        building.constructionProgress = building.buildTime;

        // Free workers
        for (const workerId of building.constructionWorkerIds) {
          const worker = state.units.get(workerId);
          if (worker && worker.state !== UnitState.DIE) {
            worker.constructionTargetId = null;
            worker.state = UnitState.IDLE;
          }
        }
        building.constructionWorkerIds = [];

        EventBus.emit("constructionComplete", { buildingId: building.id });
      }
    }
  },
};
