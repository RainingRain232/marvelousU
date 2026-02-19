// Building data: type, owner, position, health, shop inventory, spawn queue
import { BuildingState, BuildingType } from "@/types";
import type { PlayerId, UnitType, Vec2 } from "@/types";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SpawnEntry {
  unitType: UnitType;
  remainingTime: number; // Seconds until this unit is ready
}

export interface SpawnQueue {
  buildingId: string;
  entries: SpawnEntry[]; // Units currently being trained
  groupThreshold: number; // Deploy when readyUnits.length >= this
  readyUnits: UnitType[]; // Trained and waiting for group deployment
  queueEnabled: boolean; // If false, spawn each unit immediately (no grouping)
}

export interface Building {
  // Identity
  id: string;
  type: BuildingType;
  owner: PlayerId | null; // null = neutral/uncaptured

  // Spatial
  position: Vec2; // Top-left tile of footprint
  linkedBaseId: string | null; // Base this building belongs to (null = neutral)

  // State
  state: BuildingState;
  health: number;
  maxHealth: number;

  // Capture state (neutral buildings only)
  captureProgress: number; // 0.0 → 1.0; reaches 1.0 on capture
  capturePlayerId: string | null; // which player is currently capping; null = nobody

  // Economy / production
  shopInventory: UnitType[]; // Unit types this building can train
  blueprints: BuildingType[]; // Building blueprints sold from this building's shop
  spawnQueue: SpawnQueue;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateBuildingOptions {
  id: string;
  type: BuildingType;
  owner: PlayerId | null;
  position: Vec2;
  linkedBaseId?: string | null;
}

export function createBuilding(opts: CreateBuildingOptions): Building {
  const def = BUILDING_DEFINITIONS[opts.type];
  return {
    id: opts.id,
    type: opts.type,
    owner: opts.owner,
    position: { ...opts.position },
    linkedBaseId: opts.linkedBaseId ?? null,
    state: BuildingState.ACTIVE,
    health: def.hp,
    maxHealth: def.hp,
    captureProgress: 0,
    capturePlayerId: null,
    shopInventory: [...def.shopInventory],
    blueprints: [...def.blueprints],
    spawnQueue: {
      buildingId: opts.id,
      entries: [],
      groupThreshold: BalanceConfig.DEFAULT_GROUP_THRESHOLD,
      readyUnits: [],
      queueEnabled: false,
    },
  };
}
