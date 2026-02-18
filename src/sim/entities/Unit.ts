// Unit data: hp, atk, speed, state machine, position, owner
import type { PlayerId, UnitState, UnitType, Vec2 } from "@/types";

export interface Unit {
  id:       string;
  type:     UnitType;
  owner:    PlayerId;
  position: Vec2;
  hp:       number;
  maxHp:    number;
  atk:      number;
  speed:    number;
  range:    number;
  state:    UnitState;
  targetId: string | null;
  abilityIds: string[];
}
