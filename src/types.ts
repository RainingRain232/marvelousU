// Shared type aliases and enums used across sim/ and view/

export type PlayerId = string;

export interface Vec2 {
  x: number;
  y: number;
}

export enum Direction {
  WEST  = "west",
  EAST  = "east",
  NORTH = "north",
  SOUTH = "south",
}

export enum UnitType {
  SWORDSMAN   = "swordsman",
  ARCHER      = "archer",
  KNIGHT      = "knight",
  MAGE        = "mage",
  PIKEMAN     = "pikeman",
  SUMMONED    = "summoned",
}

export enum BuildingType {
  CASTLE        = "castle",
  BARRACKS      = "barracks",
  STABLES       = "stables",
  MAGE_TOWER    = "mage_tower",
  ARCHERY_RANGE = "archery_range",
}

export enum AbilityType {
  FIREBALL        = "fireball",
  CHAIN_LIGHTNING = "chain_lightning",
  WARP            = "warp",
  SUMMON          = "summon",
}

export enum UnitState {
  IDLE   = "idle",
  MOVE   = "move",
  ATTACK = "attack",
  CAST   = "cast",
  DIE    = "die",
}

export enum BuildingState {
  GHOST     = "ghost",
  ACTIVE    = "active",
  DESTROYED = "destroyed",
}

export enum GamePhase {
  PREP   = "prep",
  BATTLE = "battle",
  RESULT = "result",
}
