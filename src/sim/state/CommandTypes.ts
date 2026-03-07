// RTS command types — issued by player input or strategic AI

import type { Vec2 } from "@/types";
import type { BuildingType } from "@/types";

export enum CommandType {
  MOVE = "move",
  ATTACK_MOVE = "attack_move",
  ATTACK = "attack",
  PATROL = "patrol",
  HOLD = "hold",
  STOP = "stop",
  GATHER = "gather",
  BUILD = "build",
}

export interface UnitCommand {
  type: CommandType;
  targetPosition?: Vec2;
  targetEntityId?: string; // For ATTACK (unit/building), GATHER (resource node)
  buildingType?: BuildingType; // For BUILD
  queued?: boolean; // Shift+click = queue after current command
}
