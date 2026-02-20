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
  FIRE_MAGE = "fire_mage",
  STORM_MAGE = "storm_mage",
  PIKEMAN = "pikeman",
  SUMMONED = "summoned",
  BATTERING_RAM = "battering_ram",
  MAGE_HUNTER = "mage_hunter",
  SIEGE_HUNTER = "siege_hunter",
  SUMMONER = "summoner",
  COLD_MAGE = "cold_mage",
  SPIDER = "spider",
  GLADIATOR = "gladiator",
  DIPLOMAT = "diplomat",
}

export enum BuildingType {
  CASTLE = "castle",
  BARRACKS = "barracks",
  STABLES = "stables",
  MAGE_TOWER = "mage_tower",
  ARCHERY_RANGE = "archery_range",
  SIEGE_WORKSHOP = "siege_workshop",
  TOWN = "town",
  CREATURE_DEN = "creature_den",
  TOWER = "tower",
  FARM = "farm",
  HAMLET = "hamlet",
  EMBASSY = "embassy",
}

export enum AbilityType {
  FIREBALL = "fireball",
  CHAIN_LIGHTNING = "chain_lightning",
  WARP = "warp",
  SUMMON = "summon",
  ICE_BALL = "ice_ball",
  WEB = "web",
  GLADIATOR_NET = "gladiator_net",
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
