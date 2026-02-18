// Building data: type, owner, position, health, shop inventory, spawn queue
import type { BuildingState, BuildingType, PlayerId, UnitType, Vec2 } from "@/types";

export interface SpawnQueue {
  buildingId:     string;
  entries:        { unitType: UnitType; remainingTime: number }[];
  groupThreshold: number;
  readyUnits:     UnitType[];
}

export interface Building {
  id:            string;
  type:          BuildingType;
  owner:         PlayerId | null;
  position:      Vec2;
  state:         BuildingState;
  health:        number;
  maxHealth:     number;
  shopInventory: UnitType[];
  spawnQueue:    SpawnQueue;
}
