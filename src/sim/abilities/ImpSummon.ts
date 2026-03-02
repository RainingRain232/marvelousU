// Spawns temporary Imp units at target location
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitType } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { createUnit } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";

const SPREAD_RADIUS = 1;

let _impSummonCounter = 0;

export function _resetImpSummonCounter(): void {
  _impSummonCounter = 0;
}

export function createImpSummon(
  id: string,
  impType: UnitType,
  abilityType: AbilityType,
): Ability {
  const def = ABILITY_DEFINITIONS[abilityType];
  return {
    id,
    type: abilityType,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: false,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const count = def.summonCount ?? 1;
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const pos: Vec2 = {
          x: targetPos.x + Math.cos(angle) * SPREAD_RADIUS,
          y: targetPos.y + Math.sin(angle) * SPREAD_RADIUS,
        };

        const unit = createUnit({
          id: `imp-summoned-${++_impSummonCounter}`,
          type: impType,
          owner: caster.owner,
          position: pos,
        });

        state.units.set(unit.id, unit);

        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: caster.id,
          position: { ...pos },
        });
      }

      EventBus.emit("abilityUsed", {
        casterId: caster.id,
        abilityId: id,
        targets: [targetPos],
      });
    },
  };
}
