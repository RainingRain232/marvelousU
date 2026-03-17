// ---------------------------------------------------------------------------
// Settlers – Carrier & soldier entities
// ---------------------------------------------------------------------------

import { ResourceType } from "../config/SettlersResourceDefs";

export type SoldierType = "swordsman" | "archer" | "knight";

export interface SettlersCarrier {
  id: string;
  owner: string;
  /** Road segment this carrier operates on */
  roadId: string;

  /** Current world position (interpolated for rendering) */
  position: { x: number; y: number; z: number };

  /** Flag the carrier is currently walking toward */
  targetFlagId: string;

  /** Resource being carried (null = empty handed) */
  carrying: ResourceType | null;
  /** Target building for the carried resource */
  carryTargetBuildingId: string;

  /** 0..1 progress along current road segment path */
  pathProgress: number;
  /** Direction: 1 = flagA->flagB, -1 = flagB->flagA */
  direction: 1 | -1;

  speed: number;
}

export type SoldierState = "idle" | "marching" | "garrisoned" | "fighting";

export interface SettlersSoldier {
  id: string;
  owner: string;
  /** 0 = private, 1 = corporal, 2 = sergeant, 3 = officer, 4 = general */
  rank: number;

  /** Unit type: swordsman (default), archer, or knight */
  unitType: SoldierType;

  position: { x: number; y: number; z: number };
  state: SoldierState;

  /** Building this soldier is garrisoned in (null if not garrisoned) */
  garrisonedIn: string | null;
  /** Target military building to attack (null if none) */
  targetBuildingId: string | null;

  hp: number;
  maxHp: number;
  attackPower: number;

  /** Timer for swing cooldown */
  swingTimer: number;

  /** Attack range in tiles (1 for melee, 3 for archers) */
  attackRange: number;

  /** Movement speed in tiles/s */
  moveSpeed: number;
}

export interface SettlersCombat {
  attackerId: string;
  defenderId: string;
  /** Building being fought over */
  buildingId: string;
  position: { x: number; y: number; z: number };
}
