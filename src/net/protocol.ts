// Wire protocol types for online multiplayer.
//
// Client → Server: PlayerAction (place buildings, queue units, etc.)
// Server → Client: ServerMessage (state snapshots, confirmations, events)

import type {
  BuildingType, UnitType, UpgradeType, GamePhase, GameMode, PlayerId,
  Direction, UnitState, BuildingState, PlayerSlot,
} from "@/types";

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

export type PlayerAction =
  | { type: "place_building"; buildingType: BuildingType; x: number; y: number }
  | { type: "queue_unit"; buildingId: string; unitType: UnitType }
  | { type: "buy_upgrade"; upgradeType: UpgradeType }
  | { type: "place_flag"; x: number; y: number }
  | { type: "toggle_queue"; buildingId: string }
  | { type: "set_ready" }
  | { type: "skip_prep" };

/** Envelope sent over the wire (includes sender info added by client adapter). */
export interface ClientEnvelope {
  action: PlayerAction;
  seq: number; // Monotonic sequence number for ack/ordering
}

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: "state_snapshot"; state: SerializedGameState; tick: number }
  | { type: "action_ack"; seq: number; success: boolean; error?: string }
  | { type: "phase_changed"; phase: GamePhase; phaseTimer: number }
  | { type: "game_over"; winnerId: string | null }
  | { type: "player_joined"; playerId: PlayerId; slot: string }
  | { type: "player_left"; playerId: PlayerId }
  | { type: "room_info"; roomId: string; assignedPlayerId: PlayerId; players: RoomPlayer[] }
  | { type: "error"; message: string };

export interface RoomPlayer {
  playerId: PlayerId;
  ready: boolean;
  connected: boolean;
}

// ---------------------------------------------------------------------------
// Serialized state — JSON-safe version of GameState
// ---------------------------------------------------------------------------

/** JSON-safe representation of the full game state for network transport. */
export interface SerializedGameState {
  phase: GamePhase;
  gameMode: GameMode;
  tick: number;
  phaseTimer: number;
  eventTimer: number;
  winnerId: string | null;
  playerCount: number;

  // Entities as Record (Map → plain object)
  bases: Record<string, SerializedBase>;
  buildings: Record<string, SerializedBuilding>;
  units: Record<string, SerializedUnit>;
  projectiles: Record<string, SerializedProjectile>;

  // Players
  players: Record<string, SerializedPlayer>;
  alliances: string[]; // Set → array
  rallyFlags: Record<string, { x: number; y: number }>;
}

// --- Serialized entity types (stripped of non-serializable fields) ---

export interface SerializedUnit {
  id: string;
  type: UnitType;
  owner: string;
  position: { x: number; y: number };
  facingDirection: Direction;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  state: UnitState;
  targetId: string | null;
  attackTimer: number;
  castTimer: number;
  deathTimer: number;
  lifespanTimer: number;
  siegeOnly: boolean;
  homeguard: boolean;
  slowFactor: number;
  slowTimer: number;
  xp: number;
  level: number;
  abilityIds: string[];
  path: { x: number; y: number }[] | null;
  pathIndex: number;
  groupId: string | null;
  formationOffset: { x: number; y: number };
  constructionTargetId: string | null;
}

export interface SerializedBuilding {
  id: string;
  type: BuildingType;
  owner: string | null;
  position: { x: number; y: number };
  linkedBaseId: string | null;
  state: BuildingState;
  health: number;
  maxHealth: number;
  captureProgress: number;
  capturePlayerId: string | null;
  shopInventory: UnitType[];
  blueprints: BuildingType[];
  upgradeInventory: UpgradeType[];
  spawnQueue: {
    buildingId: string;
    entries: { unitType: UnitType; remainingTime: number }[];
    groupThreshold: number;
    readyUnits: UnitType[];
    queueEnabled: boolean;
  };
  turrets: {
    projectileTag: string;
    damage: number;
    range: number;
    attackSpeed: number;
    attackTimer: number;
    targetId: string | null;
  }[];
  constructionUnitId: string | null;
}

export interface SerializedBase {
  id: string;
  direction: Direction;
  owner: string;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  spawnOffset: { x: number; y: number };
  castleId: string | null;
}

export interface SerializedProjectile {
  id: string;
  abilityId: string;
  ownerId: string;
  ownerPlayerId: string;
  origin: { x: number; y: number };
  target: { x: number; y: number };
  position: { x: number; y: number };
  speed: number;
  damage: number;
  aoeRadius: number;
  targetId: string | null;
  hitIds: string[]; // Set<string> → string[]
  slowDuration: number;
  slowFactor: number;
}

export interface SerializedPlayer {
  id: string;
  gold: number;
  goldAccum: number;
  mana: number;
  manaAccum: number;
  direction: Direction;
  slot: PlayerSlot;
  isAI: boolean;
  ownedBaseId: string | null;
  ownedBuildings: string[];
}

// ---------------------------------------------------------------------------
// Room management (client → server)
// ---------------------------------------------------------------------------

export type RoomAction =
  | { type: "create_room"; playerCount: number }
  | { type: "join_room"; roomId: string };
