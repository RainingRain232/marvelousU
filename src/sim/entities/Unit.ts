// Unit data: hp, atk, speed, state machine, position, owner
import { Direction, UnitState, UnitType } from "@/types";
import type { PlayerId, Vec2 } from "@/types";
import { StateMachine } from "@sim/core/StateMachine";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

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
  stateMachine: StateMachine<UnitState>;
  targetId: string | null; // ID of current attack/move target (unit or building)

  // Timers (seconds)
  attackTimer: number; // Countdown to next attack; 0 = can attack
  castTimer: number; // Countdown remaining on current cast
  deathTimer: number; // Countdown after entering DIE state before removal; 0 = remove
  lifespanTimer: number; // Remaining lifespan; -1 = immortal; 0 = expire and die

  // Siege behaviour
  siegeOnly: boolean; // If true, ignores enemy units; only targets buildings/bases
  huntTargets: UnitType[]; // If non-empty, prefer nearest enemy of these types

  // Abilities
  abilityIds: string[]; // References into GameState.abilities

  // Movement (populated by MovementSystem)
  path: Vec2[] | null; // Remaining waypoints (tile coords), index 0 is next target
  pathIndex: number; // Current index into path
  groupId: string | null; // Non-null when unit belongs to a spawn group
  formationOffset: Vec2; // Perpendicular offset applied on top of the shared group path
}

// ---------------------------------------------------------------------------
// Unit ID counter
// ---------------------------------------------------------------------------

let _unitIdCounter = 0;

export function _resetUnitIdCounter(): void {
  _unitIdCounter = 0;
}

// ---------------------------------------------------------------------------
// Unit FSM transitions
// ---------------------------------------------------------------------------

/**
 * Standard unit state transitions per claud.md §5.4:
 *   IDLE → MOVE → ATTACK → IDLE
 *                 ↓
 *               CAST → IDLE
 *   Any state → DIE
 */
export const UNIT_TRANSITIONS = [
  { from: UnitState.IDLE, to: UnitState.MOVE },
  { from: UnitState.MOVE, to: UnitState.ATTACK },
  { from: UnitState.MOVE, to: UnitState.IDLE },
  { from: UnitState.ATTACK, to: UnitState.IDLE },
  { from: UnitState.ATTACK, to: UnitState.CAST },
  { from: UnitState.CAST, to: UnitState.IDLE },
  { from: "*" as const, to: UnitState.DIE },
];

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateUnitOptions {
  type: UnitType;
  owner: PlayerId;
  position: Vec2;
  /** Override the auto-generated ID (useful in tests / pools). */
  id?: string;
  /** Starting facing direction — defaults to EAST. */
  facingDirection?: Direction;
}

/**
 * Creates a fully-initialised Unit from its definition stats.
 * The unit starts in the IDLE state with a live StateMachine.
 */
export function createUnit(opts: CreateUnitOptions): Unit {
  const def = UNIT_DEFINITIONS[opts.type];
  const id = opts.id ?? `unit-${++_unitIdCounter}`;

  const stateMachine = new StateMachine<UnitState>(
    UnitState.IDLE,
    UNIT_TRANSITIONS,
  );

  return {
    id,
    type: opts.type,
    owner: opts.owner,
    position: { ...opts.position },
    facingDirection: opts.facingDirection ?? Direction.EAST,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    speed: def.speed,
    range: def.range,
    state: UnitState.IDLE,
    stateMachine,
    siegeOnly: def.siegeOnly ?? false,
    huntTargets: def.huntTargets ?? [],
    targetId: null,
    attackTimer: 0,
    castTimer: 0,
    deathTimer: 0,
    lifespanTimer: -1,
    abilityIds: [],
    path: null,
    pathIndex: 0,
    groupId: null,
    formationOffset: { x: 0, y: 0 },
  };
}
