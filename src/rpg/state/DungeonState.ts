// Dungeon crawling state — floors, rooms, fog of war
import type { DungeonTileType, Vec2 } from "@/types";
import type { RPGItem } from "./RPGState";

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface DungeonRoom {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  type: "normal" | "treasure" | "boss" | "safe" | "entrance" | "exit";
  cleared: boolean;
  encounterId: string | null;
  loot: RPGItem[];
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

export interface DungeonTile {
  x: number;
  y: number;
  type: DungeonTileType;
  walkable: boolean;
  visible: boolean;
  revealed: boolean;
  roomId: string | null;
}

export interface DungeonFloor {
  level: number;
  grid: DungeonTile[][];
  width: number;
  height: number;
  rooms: DungeonRoom[];
  corridors: Vec2[][];
  stairsDown: Vec2 | null;
  stairsUp: Vec2;
}

// ---------------------------------------------------------------------------
// DungeonState
// ---------------------------------------------------------------------------

export interface DungeonState {
  dungeonId: string;
  name: string;
  theme: string;
  floors: DungeonFloor[];
  currentFloor: number;
  partyPosition: Vec2;
  totalFloors: number;
  bossDefeated: boolean;
}
