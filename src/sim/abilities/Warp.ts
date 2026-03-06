// Teleport friendly units near caster to target location
import type { Ability } from "@sim/abilities/Ability";
import { AbilityType, UnitState } from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { ABILITY_DEFINITIONS } from "@sim/config/AbilityDefs";
import { findWalkableTowards } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";

/** Max units teleported per cast. */
const MAX_TELEPORT = 6;
/** Radius around caster to pick friendly units from. */
const GATHER_RADIUS = 3;

export function createWarp(id: string): Ability {
  const def = ABILITY_DEFINITIONS[AbilityType.WARP];
  return {
    id,
    type: AbilityType.WARP,
    cooldown: def.cooldown,
    currentCooldown: 0,
    range: def.range,
    castTime: def.castTime,
    targetPosition: null,
    targetsFriendlies: false,
    execute(caster: Unit, target: Vec2 | Unit, state: GameState): void {
      const targetPos: Vec2 =
        "position" in target ? { ...target.position } : { ...target };

      // Gather nearby friendly units (excluding caster)
      const candidates: Unit[] = [];
      for (const unit of state.units.values()) {
        if (unit.owner !== caster.owner) continue;
        if (unit.id === caster.id) continue;
        if (unit.state === UnitState.DIE) continue;
        const dx = unit.position.x - caster.position.x;
        const dy = unit.position.y - caster.position.y;
        if (dx * dx + dy * dy <= GATHER_RADIUS * GATHER_RADIUS) {
          candidates.push(unit);
        }
      }

      // Sort by distance to caster (closest first), take up to MAX_TELEPORT
      candidates.sort((a, b) => {
        const da = (a.position.x - caster.position.x) ** 2 + (a.position.y - caster.position.y) ** 2;
        const db = (b.position.x - caster.position.x) ** 2 + (b.position.y - caster.position.y) ** 2;
        return da - db;
      });

      const toTeleport = candidates.slice(0, MAX_TELEPORT);

      // Teleport each unit to a walkable tile near the target
      for (const unit of toTeleport) {
        const dest = findWalkableTowards(
          state.battlefield,
          unit.position,
          targetPos,
          8,
        );
        if (dest) {
          const from = { ...unit.position };
          unit.position.x = dest.x;
          unit.position.y = dest.y;
          EventBus.emit("unitTeleported", { unitId: unit.id, from, to: dest });
        }
      }
    },
  };
}
