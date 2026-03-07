// Unit data: hp, atk, speed, state machine, position, owner
import { Direction, UnitState, UnitType } from "@/types";
import type { PlayerId, Vec2 } from "@/types";
import { StateMachine } from "@sim/core/StateMachine";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import type { UnitCommand } from "@sim/state/CommandTypes";
import type { ResourceType } from "@sim/entities/ResourceNode";

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
  diplomatOnly: boolean; // If true, ignores all combat; seeks only neutral buildings to capture

  // Homeguard — castle-spawned units patrol near home instead of marching to enemy base
  homeguard: boolean;
  homeguardOrigin: Vec2 | null; // Castle position to patrol around

  // Status effects
  /** Speed multiplier applied while slowTimer > 0. 1 = normal, 0.4 = 40% speed. */
  slowFactor: number;
  /** Remaining seconds of slow effect. 0 = not slowed. */
  slowTimer: number;

  // Interruption timers (seconds)
  /** Current duration of an idle interruption. If > 0, unit stays in visual IDLE and skips systems. */
  idleInterruptionTimer: number;
  /** Countdown to the next idle interruption. */
  nextIdleInterruptionTimer: number;

  // Experience & levelling
  xp: number;    // Current accumulated experience points
  level: number; // Current level (0 = no level yet)

  // Questing Knight intro: seconds to idle at castle before normal behaviour
  questingKnightTimer?: number;

  // Settler/Engineer: ID of the ghost building this unit is constructing
  constructionTargetId?: string | null;

  // Abilities
  abilityIds: string[]; // References into GameState.abilities

  // Movement (populated by MovementSystem)
  path: Vec2[] | null; // Remaining waypoints (tile coords), index 0 is next target
  pathIndex: number; // Current index into path
  groupId: string | null; // Non-null when unit belongs to a spawn group
  formationOffset: Vec2; // Perpendicular offset applied on top of the shared group path
  hasCharged: boolean; // True if the unit has already landed its high-damage first hit
  pathFailCount: number; // Consecutive pathfinding failures — used to break out of stuck groups

  // Passive regeneration
  regenRate: number; // HP restored per second (0 = no regen)
  regenAccumulator: number; // Fractional HP accumulator for sub-1 healing ticks

  // RTS command system
  command: UnitCommand | null; // Current player-issued command
  commandQueue: UnitCommand[]; // Queued commands (shift+click)
  holdPosition: boolean; // If true, don't auto-march — stay put unless enemies in range

  // RTS resource carrying (workers)
  carryType: ResourceType | null;
  carryAmount: number;
  gatherTargetId: string | null; // ResourceNode ID
  dropOffBuildingId: string | null; // Building ID to return resources to
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
    diplomatOnly: def.diplomatOnly ?? false,
    homeguard: false,
    homeguardOrigin: null,
    slowFactor: 1,
    slowTimer: 0,
    targetId: null,
    attackTimer: 0,
    castTimer: 0,
    deathTimer: 0,
    lifespanTimer: -1,
    xp: 0,
    level: 0,
    abilityIds: [],
    idleInterruptionTimer: 0,
    nextIdleInterruptionTimer: 4 + Math.random() * 3, // Randomized first pause (4-7s)
    path: null,
    pathIndex: 0,
    groupId: null,
    formationOffset: { x: 0, y: 0 },
    hasCharged: false,
    pathFailCount: 0,
    regenRate: def.regenRate ?? 0,
    regenAccumulator: 0,
    // RTS fields
    command: null,
    commandQueue: [],
    holdPosition: false,
    carryType: null,
    carryAmount: 0,
    gatherTargetId: null,
    dropOffBuildingId: null,
  };
}
