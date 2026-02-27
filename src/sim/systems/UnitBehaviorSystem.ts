import type { GameState } from "@sim/state/GameState";
import { UnitState } from "@/types";

/**
 * Manages periodic idle interruptions for units.
 * Every 5-10 seconds, a unit will "pause" for 1.5 seconds.
 */
export const UnitBehaviorSystem = {
  update(state: GameState, dt: number): void {
    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;

      // 1. Tick current interruption
      if (unit.idleInterruptionTimer > 0) {
        unit.idleInterruptionTimer -= dt;
        if (unit.idleInterruptionTimer < 0) unit.idleInterruptionTimer = 0;
      }

      // 2. Tick countdown to next interruption
      if (unit.idleInterruptionTimer === 0) {
        unit.nextIdleInterruptionTimer -= dt;
        if (unit.nextIdleInterruptionTimer <= 0) {
          unit.idleInterruptionTimer = 1.5;
          unit.nextIdleInterruptionTimer = 4 + Math.random() * 3;
        }
      }
    }
  },
};
