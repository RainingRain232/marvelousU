import { AbilityType, UnitType } from "@/types";
import type { Vec2 } from "@/types";
import type { Ability } from "@sim/abilities/Ability";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";

export function createHeal(id: string): Ability {
    return {
        id,
        type: AbilityType.HEAL,
        cooldown: 0,
        currentCooldown: 0,
        range: 5,
        castTime: 0.2,
        targetPosition: null,
        targetsFriendlies: true,

        execute(caster: Unit, target: Vec2 | Unit, _state: GameState): void {
            if (!("hp" in target)) return;

            let healAmount = 20;
            if (caster.type === UnitType.CLERIC) healAmount = 40;
            if (caster.type === UnitType.SAINT) healAmount = 80;

            target.hp = Math.min(target.maxHp, target.hp + healAmount);
        },
    };
}
