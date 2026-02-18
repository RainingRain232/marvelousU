// Building data: type, owner, position, health, shop inventory, spawn queue
import type {
  BuildingState,
  BuildingType,
  PlayerId,
  UnitType,
  Vec2,
} from "@/types";

export interface SpawnEntry {
  unitType: UnitType;
  remainingTime: number; // Seconds until this unit is ready
}

export interface SpawnQueue {
  buildingId: string;
  entries: SpawnEntry[]; // Units currently being trained
  groupThreshold: number; // Deploy when readyUnits.length >= this
  readyUnits: UnitType[]; // Trained and waiting for group deployment
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

  // Economy / production
  shopInventory: UnitType[]; // Unit types this building can train
  spawnQueue: SpawnQueue;
}
