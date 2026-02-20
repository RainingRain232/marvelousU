// Spawns temporary SUMMONED units at target location
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { createUnit } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";

/** Lifespan in seconds for each summoned unit. */
export const SUMMON_LIFESPAN = 20;

/** Spread radius in tiles around the target position for unit placement. */
const SPREAD_RADIUS = 1;

let _summonCounter = 0;

export function _resetSummonCounter(): void {
  _summonCounter = 0;
}

export function createSummon(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.SUMMON];
  return {
    id,
    type: AbilityType.SUMMON,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: false,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      const count = def.summonCount ?? 3;
      const summonedIds: string[] = [];

      for (let i = 0; i < count; i++) {
        // Spread units in a small circle around the target position
        const angle = (i / count) * Math.PI * 2;
        const pos: Vec2 = {
          x: targetPos.x + Math.cos(angle) * SPREAD_RADIUS,
          y: targetPos.y + Math.sin(angle) * SPREAD_RADIUS,
        };

        const unit = createUnit({
          id: `summoned-${++_summonCounter}`,
          type: UnitType.SUMMONED,
          owner: caster.owner,
          position: pos,
        });
        unit.lifespanTimer = SUMMON_LIFESPAN;

        state.units.set(unit.id, unit);
        summonedIds.push(unit.id);

        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: caster.id, // caster acts as "source"
          position: { ...pos },
        });
      }

      // Emit abilityUsed with target position so view can render the circle
      EventBus.emit("abilityUsed", {
        casterId: caster.id,
        abilityId: id,
        targets: [targetPos],
      });
    },
  };
}
