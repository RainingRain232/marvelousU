// Unit data: hp, atk, speed, state machine, position, owner
import type { Direction, PlayerId, UnitState, UnitType, Vec2 } from "@/types";

export interface Unit {
  // Identity
  id: string;
  type: UnitType;
  owner: PlayerId;

  // Position & movement
  position: Vec2; // Tile-space position (may be fractional during movement)
  facingDirection: Direction; // Used to flip sprite scale.x in view

  // Combat stats
  hp: number;
  maxHp: number;
  atk: number;
  speed: number; // Tiles per second
  range: number; // Attack range in tiles

  // State machine
  state: UnitState;
  targetId: string | null; // ID of current attack/move target (unit or building)

  // Timers (seconds)
  attackTimer: number; // Countdown to next attack; 0 = can attack
  castTimer: number; // Countdown remaining on current cast

  // Abilities
  abilityIds: string[]; // References into GameState.abilities (future map)
}
