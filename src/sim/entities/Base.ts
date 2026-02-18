// Base data: direction, health, owner, linked buildings
import type { Direction, PlayerId, Vec2 } from "@/types";

export interface Base {
  id:          string;
  direction:   Direction;
  owner:       PlayerId;
  health:      number;
  maxHealth:   number;
  position:    Vec2;
  spawnOffset: Vec2;
}
