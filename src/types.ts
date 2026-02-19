// Shared type aliases and enums used across sim/ and view/

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Integer or fractional tile coordinate pair. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Strict integer tile coordinate (x, y must be whole numbers). */
export interface TileCoord {
  x: number;
  y: number;
}

/** Opaque string identifying a player. */
export type PlayerId = string;

/** Sentinel used for neutral / unowned entities. */
export const NEUTRAL_PLAYER: PlayerId = "__neutral__";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum Direction {
  WEST = "west",
  EAST = "east",
  NORTH = "north",
  SOUTH = "south",
}

export enum UnitType {
  SWORDSMAN = "swordsman",
  ARCHER = "archer",
  KNIGHT = "knight",
  MAGE = "mage",
  PIKEMAN = "pikeman",
  SUMMONED = "summoned",
  BATTERING_RAM = "battering_ram",
}

export enum BuildingType {
  CASTLE = "castle",
  BARRACKS = "barracks",
  STABLES = "stables",
  MAGE_TOWER = "mage_tower",
  ARCHERY_RANGE = "archery_range",
  SIEGE_WORKSHOP = "siege_workshop",
}

export enum AbilityType {
  FIREBALL = "fireball",
  CHAIN_LIGHTNING = "chain_lightning",
  WARP = "warp",
  SUMMON = "summon",
}

export enum UnitState {
  IDLE = "idle",
  MOVE = "move",
  ATTACK = "attack",
  CAST = "cast",
  DIE = "die",
}

export enum BuildingState {
  GHOST = "ghost",
  ACTIVE = "active",
  DESTROYED = "destroyed",
}

export enum GamePhase {
  PREP = "prep",
  BATTLE = "battle",
  RESOLVE = "resolve",
}
