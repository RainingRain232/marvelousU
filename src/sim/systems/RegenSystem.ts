import type { GameState } from "@sim/state/GameState";
import { UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";

/**
 * Passive regeneration system.
 * Units with regenRate > 0 heal that many HP per second automatically,
 * stopping when they reach full health. Heals and emits once per second.
 */
export const RegenSystem = {
  update(state: GameState, dt: number): void {
    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;
      if (unit.regenRate <= 0) continue;
      if (unit.hp >= unit.maxHp) continue;

      // Accumulate time, heal once per second
      unit.regenAccumulator += dt;

      if (unit.regenAccumulator >= 1) {
        unit.regenAccumulator -= 1;

        const actualHeal = Math.min(unit.maxHp - unit.hp, unit.regenRate);
        if (actualHeal > 0) {
          unit.hp += actualHeal;
          EventBus.emit("unitHealed", {
            unitId: unit.id,
            amount: actualHeal,
            position: { ...unit.position },
            isRegen: true,
          });
        }
      }
    }
  },
};
